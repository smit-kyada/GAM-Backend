# How Crawlers Work in GAM-Backend

## Overview

The GAM-Backend system uses **crawlers** to fetch data from Google Ad Manager (GAM) API and store it in MongoDB. The crawlers are tracked in the `crawler_status` collection and come in three types:

1. **hourWise** - Fetches hourly breakdown data
2. **monthToDate** - Fetches month-to-date aggregated data  
3. **adUnitWise** - Fetches ad unit level data

## Architecture

### 1. Crawler Types & Data Storage

Each crawler type stores data in different MongoDB collections:

| Crawler Type | MongoDB Collection | Schema Model |
|-------------|-------------------|--------------|
| `hourWise` | `hourwise` | `HoursWise` |
| `monthToDate` | `dailyadsmanagerreport` | `DailyAdsManagerReport` |
| `adUnitWise` | `adunitreport` | `AdUnitReport` |

### 2. Crawler Execution Flow

```
┌─────────────────┐
│  Crawler Start  │ → Log to crawler_status collection
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authenticate    │ → Use Service Account or OAuth tokens
│ with GAM API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch Data      │ → GAMClient or Python Bridge
│ from GAM API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Transform Data  │ → AdManagerConvert, GenerateObj
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in DB     │ → findOneAndUpdate with upsert
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Status   │ → Update crawler_status
└─────────────────┘
```

### 3. Authentication Methods

The system supports two authentication methods:

#### A. Service Account (Preferred)
- Uses JSON key file (e.g., `gam-360-471105-0608e8979b03.json`)
- Automatically found in project root or specified path
- Used by `GAMClient` class

#### B. OAuth Tokens (Fallback)
- Stored in `AdManager` collection
- Retrieved from database if service account not available
- Used when service account authentication fails

### 4. Data Fetching Methods

#### Method 1: Node.js GAM Client (`gamClient.js`)
- Uses `@google-ads/admanager` library
- Direct REST API calls
- May have SOAP API issues

#### Method 2: Python Bridge (`gamClientPythonBridge.js`)
- Spawns Python child process
- Uses `googleads` Python library
- More reliable for SOAP API
- Automatically falls back if Python not available

**Python Bridge Flow:**
```javascript
Node.js → Spawn Python Process → googleads library → GAM API → CSV → JSON → Node.js
```

### 5. Data Storage Process

#### For HourWise Data:

1. **Fetch Report from GAM API**
   - Dimensions: `DATE`, `HOUR`, `AD_EXCHANGE_DOMAIN`
   - Metrics: Impressions, Clicks, Revenue, etc.

2. **Transform Data**
   - Convert GAM API response to internal format
   - Group by site, date, and hour
   - Calculate derived metrics (CTR, eCPM, etc.)

3. **Store in MongoDB**
   ```javascript
   {
     date: ISODate("2025-12-13T00:00:00.000Z"),
     site: "example.com",
     impressions: 1000,
     clicks: 50,
     revenue: 25.50,
     hours: [
       { impressions: 100, clicks: 5, revenue: 2.5, ... }, // Hour 0
       { impressions: 120, clicks: 6, revenue: 3.0, ... }, // Hour 1
       // ... up to 24 hours
     ]
   }
   ```

4. **Upsert Operation**
   ```javascript
   await models?.HourWise.findOneAndUpdate(
     { site: siteData.site, date: date, isDeleted: false },
     siteData,
     { upsert: true, new: true }
   )
   ```

### 6. Crawler Status Tracking

Each crawler execution is logged in `crawler_status` collection:

```javascript
{
  _id: ObjectId("..."),
  startTime: ISODate("2025-12-13T10:22:15.843375Z"),
  endTime: ISODate("2025-12-13T10:29:16.640293Z"),
  status: "completed", // or "failed", "running"
  crawlerType: "hourWise", // or "monthToDate", "adUnitWise"
  recordsProcessed: 6159,
  duration: 420.796931, // seconds
  error: null // or error message if failed
}
```

### 7. Data Models

#### HourWise Schema:
```javascript
{
  date: Date,           // Required, indexed
  site: String,         // Required, indexed
  isDeleted: Boolean,   // Default: false
  impressions: Number,
  clicks: Number,
  ctr: Number,
  ecpm: Number,
  revenue: Number,
  totalRequests: Number,
  costPerClick: Number,
  matchRate: Number,
  hours: [              // Array of hour stats (0-23)
    {
      impressions: Number,
      clicks: Number,
      ctr: Number,
      ecpm: Number,
      revenue: Number,
      totalRequests: Number,
      costPerClick: Number,
      matchRate: Number
    }
  ]
}
```

### 8. How Data is Retrieved

When `getHoursWiseReports` is called:

1. **Query MongoDB** - Filters by date range, site, and `isDeleted: false`
2. **Transform Hours Array** - Converts hours object/array to individual rows
3. **Aggregate** - Groups and calculates totals
4. **Calculate Metrics** - CTR, eCPM, matchRate (weighted)
5. **Paginate** - Returns paginated results with totals

### 9. Key Files

| File | Purpose |
|------|---------|
| `src/functions/gamClient.js` | Node.js GAM API client |
| `src/functions/gamClientPythonBridge.js` | Python bridge for GAM API |
| `src/functions/AdManagerReport.js` | Report generation logic |
| `src/functions/AdManagerConvert.js` | Data transformation |
| `src/functions/GenerateObj.js` | Object generation |
| `src/models/hoursWise.js` | HourWise MongoDB schema |
| `src/models/dailyReport.js` | Daily report schema |
| `src/models/adUnitReport.js` | Ad unit report schema |
| `src/resolvers/hoursWise.js` | GraphQL resolvers for reading data |

### 10. When Crawlers Are Called

**Current Status: Crawlers are NOT automatically scheduled**

Crawlers are currently triggered in the following ways:

#### A. Manual API Endpoint
- **Endpoint**: `GET /ads-manager-report`
- **When**: Called manually via HTTP request
- **What it does**: Triggers `GenerateAdManagerReport()` function
- **Example**:
  ```bash
  curl http://localhost:3001/ads-manager-report
  ```

#### B. OAuth Callback (Automatic)
- **When**: After user authenticates with Google Ad Manager
- **Trigger**: `/auth/callback` endpoint
- **What it does**: Automatically generates report after successful OAuth authentication
- **Location**: `src/index.js` line 147

#### C. Scheduled (Currently Disabled)
- **Status**: ❌ No active cron jobs for crawlers
- **Note**: There's a commented-out cron job in `index.js` (lines 168-175) but it's for `FourMonthBackup`, not crawlers
- **To Enable Scheduled Crawlers**: You would need to add a cron job like:
  ```javascript
  const crawlerJob = CronJob.from({
      cronTime: '0 */6 * * *', // Every 6 hours
      onTick: function () {
          // Call crawler function here
      },
      start: true,
      timeZone: 'Asia/Kolkata'
  });
  ```

#### D. NPM Scripts (If testCrawlers.js exists)
- **Test**: `npm run test-crawlers`
- **Run**: `npm run run-crawlers`
- **Note**: The `testCrawlers.js` file is referenced in `package.json` but doesn't exist in the codebase

### 11. Error Handling

- Errors are logged to `applog` collection
- Crawler status is updated with error message
- System continues operation even if one crawler fails
- Fallback to mock data if API fails (for testing)

### 12. Performance Considerations

- **Indexes**: Collections have indexes on `site` and `date` for fast queries
- **Upsert**: Uses `findOneAndUpdate` with `upsert: true` to avoid duplicates
- **Batch Processing**: Processes data in series using `async.eachSeries`
- **Python Bridge**: More reliable but slower due to process spawning

## Summary

Crawlers are **data ingestion processes** that:
1. Authenticate with Google Ad Manager API
2. Fetch report data (hourly, daily, or ad unit level)
3. Transform and normalize the data
4. Store it in MongoDB collections
5. Track execution status in `crawler_status`

The `getHoursWiseReports` query is a **read-only operation** that retrieves and aggregates already-stored data from the `hourwise` collection.

