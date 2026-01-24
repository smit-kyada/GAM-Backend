# How to Get eCPM and CTR from Google Ad Manager

## Overview

This guide explains how eCPM (effective Cost Per Mille) and CTR (Click-Through Rate) are obtained from Google Ad Manager API and calculated in the GAM-Backend system.

## Two Methods: Direct API vs Calculated

### Method 1: Direct from GAM API (eCPM only)

Google Ad Manager API provides **eCPM directly** as a metric, but **CTR must be calculated**.

#### Available GAM API Metrics

From Google Ad Manager, you can request these metrics:

```javascript
// Metrics available from GAM API
const metrics = [
    "AD_EXCHANGE_ESTIMATED_REVENUE",  // Revenue in your currency
    "AD_EXCHANGE_IMPRESSIONS",         // Number of ad impressions
    "AD_EXCHANGE_CLICKS",              // Number of clicks
    "AD_EXCHANGE_ECPM"                 // ✅ eCPM (provided directly by GAM)
];
```

**Note**: GAM API does NOT provide CTR directly - it must be calculated.

### Method 2: Calculate from Raw Data (Both eCPM and CTR)

The system calculates both metrics from the raw data:

#### CTR Calculation

```javascript
// CTR = (Clicks / Impressions) × 100
CTR = (clicks / impressions) * 100

// Example:
// If you have 50 clicks and 1000 impressions:
CTR = (50 / 1000) * 100 = 5%
```

#### eCPM Calculation

```javascript
// eCPM = (Revenue / Impressions) × 1000
eCPM = (revenue / impressions) * 1000

// Example:
// If you have $10 revenue and 1000 impressions:
eCPM = (10 / 1000) * 1000 = $10.00
```

## Current Implementation

### 1. Fetching from GAM API

In `src/functions/AdManagerReport.js`:

```javascript
const reportQuery = {
    dimensions: ["DATE", "AD_EXCHANGE_DOMAIN", "COUNTRY_NAME"],
    columns: [
        "AD_EXCHANGE_ESTIMATED_REVENUE",  // Revenue
        "AD_EXCHANGE_IMPRESSIONS",         // Impressions
        "AD_EXCHANGE_CLICKS",              // Clicks
        "AD_EXCHANGE_ECPM"                 // eCPM (direct from API)
    ],
    dateRangeType: "LAST_7_DAYS"
};
```

### 2. Data Processing

In `src/functions/GenerateObj.js`, the eCPM from API is stored:

```javascript
Obj.ecpm = data["AD_EXCHANGE_ECPM"] ? data["AD_EXCHANGE_ECPM"] : 0;
```

### 3. Calculation in Resolvers

When querying data, the system recalculates both metrics to ensure accuracy:

#### CTR Calculation (MongoDB Aggregation)

```javascript
ctr: {
    $cond: {
        if: { $gt: ["$impressions", 0] },
        then: { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
        else: 0
    }
}
```

**Location**: `src/resolvers/hoursWise.js`, `src/resolvers/dailyReport.js`, `src/resolvers/adUnitReport.js`

#### eCPM Calculation (MongoDB Aggregation)

```javascript
ecpm: {
    $cond: {
        if: { $gt: ["$impressions", 0] },
        then: { $multiply: [{ $divide: ["$revenue", "$impressions"] }, 1000] },
        else: 0
    }
}
```

**Location**: `src/resolvers/hoursWise.js`, `src/resolvers/dailyReport.js`, `src/resolvers/adUnitReport.js`

## Complete Flow

```
┌─────────────────────────────────┐
│  Google Ad Manager API          │
│  - AD_EXCHANGE_IMPRESSIONS      │
│  - AD_EXCHANGE_CLICKS           │
│  - AD_EXCHANGE_ESTIMATED_REVENUE│
│  - AD_EXCHANGE_ECPM (optional) │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  AdManagerReport.js             │
│  Fetches data via API           │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  GenerateObj.js                 │
│  Stores:                        │
│  - impressions                  │
│  - clicks                       │
│  - revenue                      │
│  - ecpm (from API if available) │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  MongoDB Collections            │
│  - hourwise                     │
│  - dailyadsmanagerreport        │
│  - adunitreport                 │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  GraphQL Resolvers              │
│  Calculates:                    │
│  - CTR = (clicks/impressions)*100│
│  - eCPM = (revenue/impressions)*1000│
└─────────────────────────────────┘
```

## Google Ad Manager API Metrics Reference

### Available Metrics for Ad Exchange Reports

| Metric Name | Description | Unit | Provided Directly? |
|------------|-------------|------|-------------------|
| `AD_EXCHANGE_IMPRESSIONS` | Number of ad impressions | Count | ✅ Yes |
| `AD_EXCHANGE_CLICKS` | Number of clicks | Count | ✅ Yes |
| `AD_EXCHANGE_ESTIMATED_REVENUE` | Estimated revenue | Currency | ✅ Yes |
| `AD_EXCHANGE_ECPM` | Effective cost per mille | Currency | ✅ Yes |
| `AD_EXCHANGE_CTR` | Click-through rate | Percentage | ❌ No (must calculate) |

### Request Example (Python Bridge)

```python
report_query = {
    'dimensions': ['DATE', 'AD_EXCHANGE_DOMAIN', 'HOUR'],
    'columns': [
        'AD_EXCHANGE_IMPRESSIONS',
        'AD_EXCHANGE_CLICKS',
        'AD_EXCHANGE_ESTIMATED_REVENUE',
        'AD_EXCHANGE_ECPM'
    ],
    'dateRangeType': 'LAST_7_DAYS'
}
```

### Request Example (REST API)

```javascript
const reportRequest = {
    parent: `networks/${networkCode}`,
    report: {
        displayName: 'Ad Exchange Performance Report',
        reportDefinition: {
            reportType: 'HISTORICAL',
            dateRange: {
                relative: 'LAST_7_DAYS'
            },
            dimensions: ['DATE', 'AD_EXCHANGE_DOMAIN'],
            metrics: [
                'AD_EXCHANGE_IMPRESSIONS',
                'AD_EXCHANGE_CLICKS',
                'AD_EXCHANGE_ESTIMATED_REVENUE',
                'AD_EXCHANGE_ECPM'
            ],
            timeZoneSource: 'PUBLISHER'
        }
    }
};
```

## Why Calculate Instead of Using API eCPM?

The system calculates eCPM even though GAM provides it because:

1. **Accuracy**: Ensures consistency across all data sources
2. **Flexibility**: Can calculate from aggregated data
3. **Reliability**: Works even if API eCPM is missing
4. **Customization**: Can apply business logic or adjustments

## Code Examples

### Getting eCPM and CTR in Your Code

#### From GraphQL Query

```graphql
query GetReports {
  getReports(
    site: ["example.com"]
    startDate: "2025-01-01"
    endDate: "2025-01-31"
    page: 1
    limit: 10
  ) {
    docs {
      site
      date
      impressions
      clicks
      revenue
      ctr      # Calculated: (clicks/impressions)*100
      ecpm     # Calculated: (revenue/impressions)*1000
    }
    totals {
      impressions
      clicks
      revenue
      ctr      # Calculated from totals
      ecpm     # Calculated from totals
    }
  }
}
```

#### Direct Calculation (JavaScript)

```javascript
// Calculate CTR
function calculateCTR(clicks, impressions) {
    if (impressions === 0) return 0;
    return (clicks / impressions) * 100;
}

// Calculate eCPM
function calculateECPM(revenue, impressions) {
    if (impressions === 0) return 0;
    return (revenue / impressions) * 1000;
}

// Example usage
const clicks = 50;
const impressions = 1000;
const revenue = 10.50;

const ctr = calculateCTR(clicks, impressions);      // 5%
const ecpm = calculateECPM(revenue, impressions);   // $10.50
```

#### MongoDB Aggregation (for custom queries)

```javascript
{
    $project: {
        ctr: {
            $cond: {
                if: { $gt: ["$impressions", 0] },
                then: { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
                else: 0
            }
        },
        ecpm: {
            $cond: {
                if: { $gt: ["$impressions", 0] },
                then: { $multiply: [{ $divide: ["$revenue", "$impressions"] }, 1000] },
                else: 0
            }
        }
    }
}
```

## Important Notes

1. **CTR is always calculated** - GAM API doesn't provide it directly
2. **eCPM can come from API** - But system also calculates it for consistency
3. **Division by zero protection** - All calculations check if impressions > 0
4. **Currency units** - eCPM is in your account currency (USD, EUR, etc.)
5. **Percentage format** - CTR is stored as a percentage (5.5 = 5.5%, not 0.055)

## Troubleshooting

### If eCPM is 0 or incorrect:

1. Check if `AD_EXCHANGE_ESTIMATED_REVENUE` is being fetched
2. Verify impressions count is correct
3. Check currency conversion if needed
4. Verify date range includes data

### If CTR is 0 or incorrect:

1. Check if `AD_EXCHANGE_CLICKS` is being fetched
2. Verify impressions count is correct
3. Ensure clicks ≤ impressions (data validation)

## Summary

- **eCPM**: Available from GAM API as `AD_EXCHANGE_ECPM`, but also calculated as `(revenue / impressions) × 1000`
- **CTR**: Must be calculated as `(clicks / impressions) × 100` (not provided by API)
- **Both metrics** are calculated in the resolvers to ensure accuracy and consistency
- **Always check** for division by zero (impressions > 0) before calculating

