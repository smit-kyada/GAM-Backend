/**
 * Google Ad Manager Client for GAM-Backend
 * Handles GAM API authentication and report generation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { google } from 'googleapis';
import logger from '../services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GAMClient {
  constructor() {
    this.auth = null;
    this.networkCode = process.env.GAM_NETWORK_CODE || null;
    this.serviceAccountKeyPath = this.findServiceAccountKey();
    this.initializeAuth();
  }

  findServiceAccountKey() {
    // First check environment variable
    if (process.env.GAM_SERVICE_ACCOUNT_KEY_PATH) {
      const envPath = path.resolve(process.env.GAM_SERVICE_ACCOUNT_KEY_PATH);
      if (fs.existsSync(envPath)) {
        logger.info(`Using service account from env: ${envPath}`);
        return envPath;
      }
    }

    // Check common locations in project root
    const projectRoot = path.resolve(__dirname, '../../');
    const commonNames = [
      'gam-360-471105-0608e8979b03.json',
      'service-account-key.json',
      'gam-service-account.json',
      'google-service-account.json'
    ];

    for (const fileName of commonNames) {
      const filePath = path.join(projectRoot, fileName);
      if (fs.existsSync(filePath)) {
        logger.info(`Found service account key: ${filePath}`);
        return filePath;
      }
    }

    // Check in GAM Data folder (if it exists)
    const gamDataPath = path.resolve(projectRoot, '../GAM Data', 'gam-360-471105-0608e8979b03.json');
    if (fs.existsSync(gamDataPath)) {
      logger.info(`Found service account key in GAM Data folder: ${gamDataPath}`);
      return gamDataPath;
    }

    logger.warn('No service account key file found. Will use OAuth tokens from database.');
    return null;
  }

  initializeAuth() {
    try {
      // Try to use service account if path is provided
      if (this.serviceAccountKeyPath && fs.existsSync(this.serviceAccountKeyPath)) {
        this.auth = new google.auth.GoogleAuth({
          keyFile: this.serviceAccountKeyPath,
          scopes: ['https://www.googleapis.com/auth/dfp']
        });
        logger.info(`✅ GAM Client initialized with service account: ${this.serviceAccountKeyPath}`);
      } else {
        // Fallback: Use OAuth tokens from database (handled separately)
        logger.info('ℹ️  GAM Client will use OAuth tokens from database');
      }
    } catch (error) {
      logger.error(`❌ Error initializing GAM auth: ${error.message}`);
    }
  }

  async getService(serviceName, version = 'v202505', models = null) {
    try {
      let authClient;
      let accessToken;

      // Try service account first
      if (this.auth) {
        try {
          authClient = await this.auth.getClient();
          accessToken = await authClient.getAccessToken();
        } catch (error) {
          logger.warn(`Service account auth failed: ${error.message}, trying OAuth tokens`);
        }
      }

      // Fallback to OAuth tokens from database if service account fails
      if ((!accessToken || !accessToken.token) && models) {
        try {
          const tokens = await models?.AdManager?.findOne({ isDeleted: false });
          if (tokens && tokens.access_token) {
            accessToken = { token: tokens.access_token };
            logger.info('Using OAuth tokens from database');
          }
        } catch (error) {
          logger.error(`Error getting OAuth tokens from database: ${error.message}`);
        }
      }

      if (!accessToken || !accessToken.token) {
        throw new Error('No valid authentication available. Please configure GAM authentication.');
      }

      return {
        auth: authClient,
        accessToken: accessToken.token,
        networkCode: this.networkCode,
        version,
        serviceName
      };
    } catch (error) {
      logger.error(`Error getting service ${serviceName}: ${error.message}`);
      throw error;
    }
  }

  async getDataDownloader(version = 'v202505') {
    const self = this;
    
    return {
      WaitForReport: async (reportJob, models = null) => {
        return await self.runReportJob(reportJob, version, models);
      },
      DownloadReportToFile: async (reportJobId, exportFormat, fileStream, models = null) => {
        return await self.downloadReport(reportJobId, exportFormat, fileStream, version, models);
      }
    };
  }

  async runReportJob(reportJob, version = 'v202505', models = null) {
    try {
      logger.info('Submitting report job to Google Ad Manager...');
      
      const service = await this.getService('ReportService', version, models);
      
      if (!service.accessToken || !service.networkCode) {
        throw new Error('Missing access token or network code. Please configure GAM authentication.');
      }

      return await this.runReportJobManual(reportJob, service, version);
    } catch (error) {
      logger.error(`Error running report job: ${error.message}`);
      throw error;
    }
  }

  async runReportJobManual(reportJob, service, version = 'v202505') {
    try {
      const soapEndpoint = `https://ads.google.com/apis/ads/publisher/${version}/ReportService`;
      
      logger.info(`Making SOAP request to: ${soapEndpoint}`);
      logger.info(`Network Code: ${service.networkCode}`);
      
      const soapEnvelope = this.buildSOAPEnvelope('runReportJob', {
        reportJob: {
          reportQuery: reportJob.reportQuery
        }
      }, service);
      
      const response = await axios.post(soapEndpoint, soapEnvelope, {
        headers: {
          'Authorization': `Bearer ${service.accessToken}`,
          'X-GOOGLE-DFP-NETWORK-CODE': service.networkCode,
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 60000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      if (response.status === 404) {
        throw new Error(`404 Not Found: The SOAP endpoint ${soapEndpoint} does not exist.`);
      }
      
      if (response.status !== 200) {
        throw new Error(`SOAP request failed with status ${response.status}: ${response.statusText}`);
      }
      
      const reportJobId = this.parseSOAPResponse(response.data, 'runReportJob');
      
      if (!reportJobId) {
        throw new Error('Failed to parse report job ID from SOAP response');
      }
      
      logger.info(`Report job submitted with ID: ${reportJobId}`);
      
      return await this.waitForReportCompletion(reportJobId, service, version);
    } catch (error) {
      logger.error(`Error in manual report job submission: ${error.message}`);
      throw error;
    }
  }

  buildSOAPEnvelope(methodName, parameters, service) {
    const namespace = 'https://www.google.com/apis/ads/publisher';
    const soapBody = this.buildSOAPBody(methodName, parameters, namespace);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="${namespace}">
  <soapenv:Header/>
  <soapenv:Body>
    ${soapBody}
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  buildSOAPBody(methodName, parameters, namespace) {
    const paramsXml = this.objectToXML(parameters, 'ns1');
    return `<ns1:${methodName}>${paramsXml}</ns1:${methodName}>`;
  }

  objectToXML(obj, prefix = '') {
    let xml = '';
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        xml += `<${prefix}:${key}>${this.objectToXML(value, prefix)}</${prefix}:${key}>`;
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          xml += `<${prefix}:${key}>${typeof item === 'object' ? this.objectToXML(item, prefix) : item}</${prefix}:${key}>`;
        });
      } else {
        xml += `<${prefix}:${key}>${value}</${prefix}:${key}>`;
      }
    }
    return xml;
  }

  parseSOAPResponse(xmlResponse, methodName) {
    try {
      const idMatch = xmlResponse.match(/<id>(\d+)<\/id>/);
      if (idMatch) {
        return idMatch[1];
      }
      
      const altMatch = xmlResponse.match(/<rval[^>]*>.*?<id>(\d+)<\/id>/s);
      if (altMatch) {
        return altMatch[1];
      }
      
      return null;
    } catch (error) {
      logger.error(`Error parsing SOAP response: ${error.message}`);
      return null;
    }
  }

  async waitForReportCompletion(reportJobId, service, version = 'v202505', maxWaitTime = 300000) {
    const startTime = Date.now();
    const checkInterval = 10000; // 10 seconds
    
    try {
      while (Date.now() - startTime < maxWaitTime) {
        try {
          const status = await this.getReportJobStatus(reportJobId, service, version);
          logger.info(`Report status: ${status}`);
          
          if (status === 'COMPLETED') {
            logger.info('Report completed successfully!');
            return reportJobId;
          } else if (status === 'FAILED') {
            throw new Error('Report generation failed');
          } else if (status === 'CANCELED') {
            throw new Error('Report generation was canceled');
          }
          
          await this.sleep(checkInterval);
        } catch (error) {
          logger.error(`Error checking report status: ${error.message}`);
          await this.sleep(checkInterval);
        }
      }
      
      throw new Error('Report generation timed out');
    } catch (error) {
      logger.error(`Error waiting for report completion: ${error.message}`);
      throw error;
    }
  }

  async getReportJobStatus(reportJobId, service, version = 'v202505') {
    try {
      const soapEndpoint = `https://ads.google.com/apis/ads/publisher/${version}/ReportService`;
      const soapEnvelope = this.buildSOAPEnvelope('getReportJobStatus', {
        reportJobId: reportJobId
      }, service);
      
      const response = await axios.post(soapEndpoint, soapEnvelope, {
        headers: {
          'Authorization': `Bearer ${service.accessToken}`,
          'X-GOOGLE-DFP-NETWORK-CODE': service.networkCode,
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 60000
      });
      
      const statusMatch = response.data.match(/<rval>(\w+)<\/rval>/);
      return statusMatch ? statusMatch[1] : 'UNKNOWN';
    } catch (error) {
      logger.error(`Error getting report status: ${error.message}`);
      throw error;
    }
  }

  async getReportDownloadUrl(reportJobId, exportFormat, version = 'v202505', models = null) {
    try {
      const service = await this.getService('ReportService', version, models);
      return await this.getReportDownloadUrlManual(reportJobId, exportFormat, service, version);
    } catch (error) {
      logger.error(`Error getting download URL: ${error.message}`);
      throw error;
    }
  }

  async getReportDownloadUrlManual(reportJobId, exportFormat, service, version = 'v202505') {
    try {
      const soapEndpoint = `https://ads.google.com/apis/ads/publisher/${version}/ReportService`;
      const soapEnvelope = this.buildSOAPEnvelope('getReportDownloadUrl', {
        reportJobId: reportJobId,
        exportFormat: exportFormat
      }, service);
      
      const response = await axios.post(soapEndpoint, soapEnvelope, {
        headers: {
          'Authorization': `Bearer ${service.accessToken}`,
          'X-GOOGLE-DFP-NETWORK-CODE': service.networkCode,
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': ''
        },
        timeout: 60000
      });
      
      const downloadUrl = this.parseSOAPResponseForURL(response.data);
      
      if (!downloadUrl) {
        throw new Error('Failed to parse download URL from SOAP response');
      }
      
      logger.info(`Download URL obtained: ${downloadUrl}`);
      return downloadUrl;
    } catch (error) {
      logger.error(`Error in manual download URL retrieval: ${error.message}`);
      throw error;
    }
  }

  parseSOAPResponseForURL(xmlResponse) {
    try {
      const urlMatch = xmlResponse.match(/<rval[^>]*>(https?:\/\/[^<]+)<\/rval>/);
      if (urlMatch) {
        return urlMatch[1];
      }
      
      const altMatch = xmlResponse.match(/https?:\/\/[^\s<>"]+/);
      if (altMatch) {
        return altMatch[0];
      }
      
      return null;
    } catch (error) {
      logger.error(`Error parsing SOAP response for URL: ${error.message}`);
      return null;
    }
  }

  async downloadAndParseReport(downloadUrl, models = null) {
    try {
      const service = await this.getService('ReportService', 'v202505', models);
      
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'Authorization': `Bearer ${service.accessToken}`
        }
      });
      
      let csvContent;
      
      // Check if content is gzipped
      if (response.data[0] === 0x1f && response.data[1] === 0x8b) {
        const zlib = await import('zlib');
        const { promisify } = await import('util');
        const gunzip = promisify(zlib.gunzip);
        csvContent = (await gunzip(response.data)).toString('utf-8');
        logger.info('Successfully decompressed gzipped content');
      } else {
        csvContent = response.data.toString('utf-8');
      }
      
      if (!csvContent.trim()) {
        throw new Error('Downloaded CSV content is empty');
      }
      
      logger.info(`CSV downloaded successfully (${csvContent.length} characters)`);
      
      const parsedData = this.parseCSVData(csvContent);
      logger.info(`CSV parsed successfully (${parsedData.length} rows)`);
      
      return parsedData;
    } catch (error) {
      logger.error(`Error downloading and parsing report: ${error.message}`);
      throw error;
    }
  }

  parseCSVData(csvContent) {
    try {
      const lines = csvContent.trim().split('\n');
      
      if (lines.length < 2) {
        logger.warn(`CSV has only ${lines.length} lines, need at least 2 (header + data)`);
        return [];
      }
      
      const headers = lines[0].split(',');
      logger.info(`CSV headers: ${headers.join(', ')}`);
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const values = line.split(',');
          if (values.length >= headers.length) {
            const row = {};
            for (let j = 0; j < headers.length; j++) {
              row[headers[j].trim()] = values[j] ? values[j].trim() : '';
            }
            data.push(row);
          } else {
            logger.warn(`Line ${i + 1} has ${values.length} values, expected ${headers.length}`);
          }
        }
      }
      
      logger.info(`Successfully parsed ${data.length} data rows`);
      return data;
    } catch (error) {
      logger.error(`Error parsing CSV: ${error.message}`);
      return [];
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default GAMClient;

