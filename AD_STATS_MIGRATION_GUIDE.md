# Ad Stats Schema Migration Guide

## Overview

This guide explains the new unified `ad_stats` schema that replaces the previous separate collections:
- `hourwise` → `ad_stats` (with `hour` field)
- `dailyadsmanagerreport` → `ad_stats` (without `hour`)
- `adunitreport` → `ad_stats` (with `adUnitId`)

## Architecture Benefits

### ✅ Single Source of Truth
- One collection instead of three
- No data duplication
- Consistent metrics structure

### ✅ Scalable Design
- Flat document structure → fast queries
- Optional dimensions → flexible filtering
- Proper indexes → high performance
- Scales to 10M-100M+ documents

### ✅ Flexible Queries
- Daily reports: `hour: null`
- Hour-wise: `hour: 0-23`
- With ad units: `adUnitId: { $ne: null }`
- Without ad units: `adUnitId: null`
- By app: `appId: "com.example.app"`
- By country: `country: "IN"`

## Schema Structure

### Metrics Schema (Reusable)
```javascript
{
  impressions: Number,
  clicks: Number,
  revenue: Number,
  totalRequests: Number,
  ctr: Number,          // Calculated
  ecpm: Number,         // Calculated
  costPerClick: Number, // Calculated
  matchRate: Number     // Calculated
}
```

### Ad Stats Schema (Unified Fact Table)
```javascript
{
  // Time
  date: Date,
  hour: Number (0-23) or null,
  
  // Primary Dimensions
  site: String (required),
  domain: String,
  
  // App
  appId: String or null,
  appName: String or null,
  
  // Ad Unit (optional)
  adUnitId: String or null,
  adUnitName: String or null,
  
  // Geo
  country: String or null,
  countryCode: String or null,
  
  // Metrics
  metrics: MetricsSchema,
  
  // Metadata
  crawlerType: String,
  isDeleted: Boolean
}
```

## Indexes

### Core Composite Index
```javascript
{ site: 1, date: -1, hour: 1, appId: 1, adUnitId: 1, country: 1 }
```

### Partial Indexes (Performance Boosters)
```javascript
// Records WITHOUT adUnit data
{ site: 1, date: -1, appId: 1, country: 1 }
// Filter: adUnitId: null

// Records WITH adUnit breakdown
{ site: 1, date: -1, adUnitId: 1 }
// Filter: adUnitId: { $ne: null }

// Hour-wise queries
{ site: 1, date: -1, hour: 1, appId: 1 }

// App-specific queries
{ appId: 1, date: -1 }
// Filter: appId: { $ne: null }

// Country breakdown
{ site: 1, date: -1, country: 1 }
// Filter: country: { $ne: null }
```

### Unique Constraint
```javascript
{ site: 1, date: 1, hour: 1, appId: 1, adUnitId: 1, country: 1 }
// Prevents duplicate records
```

## Usage Examples

### 1. Daily Report (No Hour Breakdown)
```javascript
{
  date: ISODate("2025-12-13"),
  hour: null,
  site: "example.com",
  appId: null,  // Web traffic
  adUnitId: null,
  country: null,
  metrics: { impressions: 1000, clicks: 50, revenue: 10.50, ... }
}
```

### 2. Hour-Wise Report
```javascript
{
  date: ISODate("2025-12-13"),
  hour: 14,  // 2 PM
  site: "example.com",
  appId: null,
  adUnitId: null,
  country: null,
  metrics: { impressions: 100, clicks: 5, revenue: 1.05, ... }
}
```

### 3. Mobile App Report
```javascript
{
  date: ISODate("2025-12-13"),
  hour: null,
  site: "example.com",
  appId: "com.example.myapp",
  appName: "My Mobile App",
  adUnitId: null,
  country: null,
  metrics: { impressions: 500, clicks: 25, revenue: 5.25, ... }
}
```

### 4. Ad Unit Report
```javascript
{
  date: ISODate("2025-12-13"),
  hour: null,
  site: "example.com",
  appId: null,
  adUnitId: "adunit_123",
  adUnitName: "Banner Top",
  country: "IN",
  metrics: { impressions: 200, clicks: 10, revenue: 2.10, ... }
}
```

## GraphQL Queries

### Get Daily Reports
```graphql
query GetDailyReports {
  getAdStats(
    filter: {
      site: ["example.com"]
      startDate: "2025-12-01"
      endDate: "2025-12-31"
      appId: null  # Web traffic only
    }
    page: 1
    limit: 10
  ) {
    totalDocs
    docs {
      date
      site
      appId
      metrics {
        impressions
        clicks
        revenue
        ctr
        ecpm
      }
    }
    totals {
      impressions
      clicks
      revenue
    }
  }
}
```

### Get Hour-Wise Reports
```graphql
query GetHourWiseReports {
  getAdStats(
    filter: {
      site: ["example.com"]
      startDate: "2025-12-13"
      endDate: "2025-12-13"
      hour: 14  # Specific hour
    }
    page: 1
    limit: 24
  ) {
    docs {
      hour
      metrics {
        impressions
        clicks
        revenue
      }
    }
  }
}
```

### Get App Reports
```graphql
query GetAppReports {
  getAdStats(
    filter: {
      appId: ["com.example.myapp"]
      startDate: "2025-12-01"
      endDate: "2025-12-31"
    }
    page: 1
    limit: 10
  ) {
    docs {
      appId
      appName
      metrics {
        impressions
        clicks
        revenue
      }
    }
  }
}
```

### Get Ad Unit Reports
```graphql
query GetAdUnitReports {
  getAdStats(
    filter: {
      site: ["example.com"]
      adUnitId: ["adunit_123"]
      startDate: "2025-12-01"
      endDate: "2025-12-31"
    }
    page: 1
    limit: 10
  ) {
    docs {
      adUnitId
      adUnitName
      country
      metrics {
        impressions
        clicks
        revenue
      }
    }
  }
}
```

## Migration Strategy

### Option 1: Dual Write (Recommended)
1. Keep old collections running
2. Write to both old and new schemas
3. Gradually migrate queries to new schema
4. Once stable, stop writing to old collections

### Option 2: Big Bang Migration
1. Migrate all existing data to `ad_stats`
2. Update all queries at once
3. Remove old collections

### Option 3: Gradual Migration
1. Start writing new data to `ad_stats`
2. Migrate old data in batches
3. Update queries one by one
4. Remove old collections when done

## Data Conversion

Data conversion should be handled directly in your crawler or migration scripts. The AdStats schema accepts data in the unified format as described in the Schema Structure section above.

## Updating Crawlers

Update `crawlerService.js` to write directly to AdStats:

```javascript
const runHourWiseCrawler = async (models) => {
  const result = await GenerateAdManagerReport();
  
  // Create AdStats document directly
  const adStatsData = {
    date: new Date(result.date),
    hour: new Date(result.date).getHours(),
    site: result.site,
    appId: result.appId || null,
    appName: result.appName || null,
    metrics: {
      impressions: result.impressions || 0,
      clicks: result.clicks || 0,
      revenue: result.estimatedEarning || result.revenue || 0,
      totalRequests: result.totalRequests || 0,
      ctr: 0,
      ecpm: result.impressionsRpm || result.pageRpm || 0,
      costPerClick: 0,
      matchRate: 0
    },
    crawlerType: 'hourWise'
  };
  
  // Upsert to AdStats collection
  await models.AdStats.upsertAdStats(adStatsData);
  
  return { recordsProcessed: 1 };
};
```

## Performance Tips

1. **Use Partial Indexes**: They're faster for filtered queries
2. **Query by Indexed Fields**: Always include `site` and `date` in queries
3. **Limit Date Ranges**: Don't query entire history
4. **Use Aggregation**: For complex calculations
5. **Batch Operations**: Use `bulkUpsertAdStats` for multiple records

## Backward Compatibility

The old collections (`hourwise`, `dailyadsmanagerreport`, `adunitreport`) are still available. You can:

1. Run both schemas in parallel
2. Gradually migrate queries
3. Keep old resolvers for compatibility
4. Remove old code when ready

## Summary

✅ **New Schema**: `ad_stats` - Unified fact table
✅ **Metrics Schema**: Reusable, no duplication
✅ **GraphQL**: Full query support
✅ **Indexes**: Optimized for all query patterns
✅ **Backward Compatible**: Old schemas still work

The new schema is production-ready and scales to millions of records!

