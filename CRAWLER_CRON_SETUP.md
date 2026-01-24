# Crawler Cron Jobs Setup

## Overview

Three crawler cron jobs have been configured to automatically fetch and store data from Google Ad Manager API:

1. **hourWise** - Runs every 5 minutes
2. **monthToDate** - Runs daily at 8:45 AM
3. **adUnitWise** - Runs every 2 hours

## Cron Schedule Details

| Crawler Type | Schedule | Cron Expression | Timezone |
|-------------|----------|----------------|----------|
| hourWise | Every 5 minutes | `*/5 * * * *` | Asia/Kolkata |
| monthToDate | Daily at 8:45 AM | `45 8 * * *` | Asia/Kolkata |
| adUnitWise | Every 2 hours | `0 */2 * * *` | Asia/Kolkata |

## Files Modified/Created

### 1. `src/functions/crawlerService.js` (NEW)
- Handles crawler execution
- Logs status to `crawler_status` collection
- Tracks start time, end time, duration, records processed, and errors

### 2. `src/index.js` (MODIFIED)
- Added import for `crawlerService`
- Added three cron job definitions
- Cron jobs start automatically when server starts

## How It Works

### Crawler Execution Flow

1. **Cron Job Triggers** → Calls `runCrawler(crawlerType, models)`
2. **Log Start** → Creates entry in `crawler_status` collection with status "running"
3. **Execute Crawler** → Calls appropriate crawler function:
   - `runHourWiseCrawler()` for hourWise
   - `runMonthToDateCrawler()` for monthToDate
   - `runAdUnitWiseCrawler()` for adUnitWise
4. **Fetch Data** → Calls GAM API via `GenerateAdManagerReport()`
5. **Store Data** → Saves to appropriate MongoDB collection
6. **Log Completion** → Updates `crawler_status` with:
   - `status`: "completed" or "failed"
   - `endTime`: Completion timestamp
   - `duration`: Execution time in seconds
   - `recordsProcessed`: Number of records saved
   - `error`: Error message if failed

### Crawler Status Tracking

Each crawler execution creates a document in `crawler_status` collection:

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

## Monitoring

### Check Crawler Status

Use the count crawlers script:
```bash
npm run count-crawlers
```

### View Logs

Crawler execution is logged using the logger service:
- Success: `✅ {crawlerType} crawler completed in {duration}s. Records: {count}`
- Error: `❌ {crawlerType} crawler failed: {error message}`

### Check Database

Query `crawler_status` collection:
```javascript
db.crawler_status.find().sort({ startTime: -1 }).limit(10)
```

## Error Handling

- Errors are caught and logged to `crawler_status` collection
- Errors are also logged to `applog` collection
- Cron jobs continue running even if one execution fails
- Failed crawler status includes error message

## Customization

### Modify Crawler Functions

Edit `src/functions/crawlerService.js` to customize:
- GAM API query parameters
- Data transformation logic
- Storage logic for each crawler type

### Change Schedule

Edit cron expressions in `src/index.js`:

```javascript
// Example: Change hourWise to run every 10 minutes
cronTime: '*/10 * * * *'

// Example: Change monthToDate to run at 9:00 AM
cronTime: '0 9 * * *'

// Example: Change adUnitWise to run every 3 hours
cronTime: '0 */3 * * *'
```

### Disable a Crawler

Comment out or remove the cron job definition in `src/index.js`:

```javascript
// const hourWiseCrawlerJob = CronJob.from({ ... });
```

## Cron Expression Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 or 7 is Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Examples

- `*/5 * * * *` - Every 5 minutes
- `0 */2 * * *` - Every 2 hours at minute 0
- `45 8 * * *` - Daily at 8:45 AM
- `0 0 * * *` - Daily at midnight
- `0 9 * * 1` - Every Monday at 9:00 AM

## Testing

### Test Individual Crawler

You can manually trigger a crawler:

```javascript
import { runCrawler } from './functions/crawlerService.js';
import models from './models/index.js';

// Test hourWise crawler
await runCrawler('hourWise', models);
```

### Verify Cron Jobs Are Running

Check server logs on startup:
```
✅ Crawler cron jobs initialized:
   - hourWise: Every 5 minutes
   - monthToDate: Daily at 8:45 AM
   - adUnitWise: Every 2 hours
```

## Notes

- Cron jobs use **Asia/Kolkata** timezone
- All crawlers currently use the same `GenerateAdManagerReport()` function
- Future enhancement: Customize each crawler to fetch specific data types
- Ensure database connection is established before cron jobs run
- Cron jobs start automatically when server starts

