import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = 3001;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
        ? `${process.env.CALLBACK_URL}/auth/callback`
        : `http://localhost:3001/auth/callback`,
);

// Google Ad Manager API (DFP)
const dfp = google.dfareporting('v4');

app.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      // Ad Manager read scope
      // "https://www.googleapis.com/auth/dfatrafficking",
      // "https://www.googleapis.com/auth/dfareporting",
      "https://www.googleapis.com/auth/admanager"
      // AdSense read scope (for existing functionality)
      // "https://www.googleapis.com/auth/adsense.readonly"
  ],
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) return res.send('No code provided');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Optionally save tokens here (e.g., to file or DB)

    res.send('Login successful! You can now visit /ads-manager-report');
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Get list of networks (Ad Manager accounts)
app.get('/networks', async (req, res) => {
  try {
    const result = await dfp.userProfiles.list({
      auth: oauth2Client,
    });

    console.log('Available Networks:', result.data);
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching networks:', error.response?.data || error.message);
    res.status(500).send('Failed to fetch networks');
  }
});

// Generate Ad Manager report
app.get('/ads-manager-report', async (req, res) => {
  try {
    // First, get the profile ID (network)
    const profilesResult = await dfp.userProfiles.list({
      auth: oauth2Client,
    });

    if (!profilesResult.data.items || profilesResult.data.items.length === 0) {
      return res.status(404).send('No Ad Manager profiles found');
    }

    const profileId = profilesResult.data.items[0].profileId;
    
    // Create a report request
    const reportRequest = {
      auth: oauth2Client,
      profileId: profileId,
      resource: {
        name: 'Ad Manager Report',
        type: 'STANDARD',
        format: 'JSON',
        dateRange: {
          relativeDateRange: 'LAST_7_DAYS'
        },
        criteria: {
          dateRange: {
            relativeDateRange: 'LAST_7_DAYS'
          },
          dimensions: [
            'DATE',
            'AD_UNIT_NAME'
          ],
          metrics: [
            'IMPRESSIONS',
            'CLICKS',
            'TOTAL_REVENUE_ADVERTISER_CURRENCY'
          ]
        }
      }
    };

    // Insert the report
    const reportResult = await dfp.reports.insert(reportRequest);
    const reportId = reportResult.data.id;

    console.log('Report created with ID:', reportId);

    // Run the report
    const runResult = await dfp.reports.run({
      auth: oauth2Client,
      profileId: profileId,
      reportId: reportId
    });

    console.log('Report run result:', runResult.data);

    // Note: In production, you'd want to poll for completion and then get results
    res.json({
      message: 'Report generation started',
      reportId: reportId,
      status: runResult.data,
      profileId: profileId
    });

  } catch (error) {
    console.error('Error generating Ad Manager report:', error.response?.data || error.message);
    res.status(500).send('Failed to generate Ad Manager report');
  }
});

// Get report results (call this after report is completed)
app.get('/ads-manager-report-results/:profileId/:reportId', async (req, res) => {
  try {
    const { profileId, reportId } = req.params;

    // Check report status
    const reportStatus = await dfp.reports.get({
      auth: oauth2Client,
      profileId: profileId,
      reportId: reportId
    });

    console.log('Report status:', reportStatus.data);

    if (reportStatus.data.lastModifiedTime) {
      // Get report files
      const filesResult = await dfp.reports.files.list({
        auth: oauth2Client,
        profileId: profileId,
        reportId: reportId
      });

      if (filesResult.data.items && filesResult.data.items.length > 0) {
        const fileId = filesResult.data.items[0].id;
        
        // Get file content (this returns a download URL)
        const fileResult = await dfp.reports.files.get({
          auth: oauth2Client,
          profileId: profileId,
          reportId: reportId,
          fileId: fileId
        });

        res.json({
          reportData: fileResult.data,
          downloadUrl: fileResult.data.urls?.apiUrl
        });
      } else {
        res.json({ message: 'Report is still processing, please try again later' });
      }
    } else {
      res.json({ message: 'Report is still running, please try again later' });
    }

  } catch (error) {
    console.error('Error fetching report results:', error.response?.data || error.message);
    res.status(500).send('Failed to fetch report results');
  }
});

// Alternative: Using Google Ad Manager API directly (if you have access)
app.get('/gam-report', async (req, res) => {
  try {
    // This requires the Google Ad Manager API to be enabled
    // and proper service account credentials
    
    res.json({
      message: 'Google Ad Manager API integration would go here',
      note: 'This requires service account credentials and GAM API access'
    });
    
  } catch (error) {
    console.error('Error with GAM API:', error);
    res.status(500).send('GAM API error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('- GET /auth - Start OAuth flow');
  console.log('- GET /networks - List available Ad Manager networks');
  console.log('- GET /ads-manager-report - Generate new report');
  console.log('- GET /ads-manager-report-results/:profileId/:reportId - Get report results');
});