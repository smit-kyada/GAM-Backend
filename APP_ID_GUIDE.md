# Google Ad Manager API - App ID Support

## Overview

**Yes, Google Ad Manager API provides App ID** for mobile applications. There are two ways to access it:

1. **`applicationCode`** - In the MobileApplicationService
2. **`MOBILE_APP_ID`** - As a dimension in reports

## 1. Application Code (MobileApplicationService)

### What is it?

The `applicationCode` is a read-only identifier that Google populates when a mobile application is claimed in Ad Manager. This is the "App ID" shown in the Ad Manager UI.

### Properties

- **Read-only**: Cannot be set manually
- **Auto-populated**: Google sets it when app is claimed
- **Unique identifier**: Identifies the app within the SDK

### API Access

```javascript
// Using MobileApplicationService
const mobileApp = {
    applicationCode: "com.example.myapp",  // This is the App ID
    name: "My Mobile App",
    // ... other properties
};
```

## 2. MOBILE_APP_ID Dimension (Reports)

### What is it?

`MOBILE_APP_ID` is a dimension you can use in Ad Manager reports to filter and group data by mobile application.

### Report Types Supported

- ✅ **Historical Reports** - Available
- ✅ **Privacy and Messaging Reports** - Available
- ❌ **Reach Reports** - Not available

### Usage in Reports

#### Example: Request with MOBILE_APP_ID dimension

```javascript
const reportRequest = {
    parent: `networks/${networkCode}`,
    report: {
        displayName: 'Mobile App Performance Report',
        reportDefinition: {
            reportType: 'HISTORICAL',
            dateRange: {
                relative: 'LAST_7_DAYS'
            },
            dimensions: [
                'DATE',
                'MOBILE_APP_ID',        // ✅ App ID dimension
                'AD_EXCHANGE_DOMAIN',
                'AD_UNIT_NAME'
            ],
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

#### Example: Using Python Bridge

```python
report_query = {
    'dimensions': [
        'DATE',
        'MOBILE_APP_ID',           # ✅ App ID dimension
        'AD_EXCHANGE_DOMAIN',
        'AD_UNIT_NAME'
    ],
    'columns': [
        'AD_EXCHANGE_IMPRESSIONS',
        'AD_EXCHANGE_CLICKS',
        'AD_EXCHANGE_ESTIMATED_REVENUE',
        'AD_EXCHANGE_ECPM'
    ],
    'dateRangeType': 'LAST_7_DAYS'
}
```

## Implementation in Your Codebase

### Current Status

Your current implementation in `src/functions/AdManagerReport.js` does **NOT** include `MOBILE_APP_ID` dimension. To add it:

### Option 1: Add to Existing Report

```javascript
// In AdManagerReport.js, modify reportQuery:
const reportQuery = {
    dimensions: [
        "DATE", 
        "AD_EXCHANGE_DOMAIN", 
        "COUNTRY_NAME",
        "MOBILE_APP_ID"  // ✅ Add App ID dimension
    ],
    columns: [
        "AD_EXCHANGE_ESTIMATED_REVENUE",
        "AD_EXCHANGE_IMPRESSIONS", 
        "AD_EXCHANGE_CLICKS",
        "AD_EXCHANGE_ECPM"
    ],
    dateRangeType: "LAST_7_DAYS"
};
```

### Option 2: Create Mobile App Specific Report

```javascript
// Create a new function for mobile app reports
const GenerateMobileAppReport = async () => {
    const reportRequest = {
        parent: `networks/${networkCode}`,
        report: {
            displayName: 'Mobile App Performance Report',
            reportDefinition: {
                reportType: 'HISTORICAL',
                dateRange: {
                    relative: 'LAST_7_DAYS'
                },
                dimensions: [
                    'DATE',
                    'MOBILE_APP_ID',        // App ID
                    'AD_UNIT_NAME',
                    'COUNTRY_NAME'
                ],
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
    
    // ... rest of report generation logic
};
```

## Available Dimensions for Mobile Apps

When working with mobile applications, you can use these dimensions:

| Dimension | Description | Use Case |
|-----------|-------------|----------|
| `MOBILE_APP_ID` | App identifier | Filter/group by app |
| `MOBILE_APP_NAME` | App name | Display app name |
| `MOBILE_DEVICE_NAME` | Device name | Filter by device |
| `MOBILE_CARRIER_NAME` | Carrier name | Filter by carrier |
| `MOBILE_APP_PLATFORM` | Platform (iOS/Android) | Filter by platform |

## Data Processing

### Handling MOBILE_APP_ID in GenerateObj.js

If you add `MOBILE_APP_ID` to your reports, you'll need to process it:

```javascript
// In GenerateObj.js
export const GenerateAdManagerReportObj = (data) => {
    let Obj = {};
    Obj.site = data["AD_EXCHANGE_DOMAIN"] || data["AD_UNIT_NAME"] || data["DOMAIN_NAME"];
    Obj.date = data["DATE"];
    Obj.appId = data["MOBILE_APP_ID"] || null;  // ✅ Add App ID
    Obj.appName = data["MOBILE_APP_NAME"] || null;  // Optional: App name
    // ... rest of the object
    return Obj;
};
```

### Database Schema Update

If you want to store App ID, update your models:

```javascript
// Example: Add to SiteTable schema
const SiteTableSchema = new mongoose.Schema({
    site: { type: String, required: true },
    date: { type: Date, required: true },
    appId: { type: String, default: null },      // ✅ Add App ID
    appName: { type: String, default: null },    // Optional: App name
    // ... existing fields
});
```

## Complete Example

### Full Report Request with App ID

```javascript
const reportRequest = {
    parent: `networks/${networkCode}`,
    report: {
        displayName: 'Mobile App Ad Exchange Report',
        reportDefinition: {
            reportType: 'HISTORICAL',
            dateRange: {
                relative: 'LAST_7_DAYS'
            },
            dimensions: [
                'DATE',
                'MOBILE_APP_ID',           // App identifier
                'MOBILE_APP_NAME',         // App name (optional)
                'MOBILE_APP_PLATFORM',     // iOS/Android (optional)
                'AD_EXCHANGE_DOMAIN',
                'AD_UNIT_NAME',
                'COUNTRY_NAME'
            ],
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

## Important Notes

1. **Mobile Apps Only**: `MOBILE_APP_ID` is only available for mobile applications, not web properties
2. **Report Type**: Only available in `HISTORICAL` and `PRIVACY_AND_MESSAGING` report types
3. **App Must Be Claimed**: The app must be claimed in Ad Manager for data to appear
4. **Null Values**: Web traffic will have `null` or empty `MOBILE_APP_ID` values

## Filtering by App ID

### In Report Request

```javascript
// Filter to specific app (if supported by API)
const reportRequest = {
    // ... report definition
    filters: [
        {
            dimension: 'MOBILE_APP_ID',
            value: 'com.example.myapp'
        }
    ]
};
```

### In Your Application

```javascript
// Filter data after fetching
const appData = reportData.filter(row => 
    row.MOBILE_APP_ID === 'com.example.myapp'
);
```

## Summary

✅ **Yes, GAM API provides App ID** in two ways:
1. **`applicationCode`** - From MobileApplicationService (read-only, auto-populated)
2. **`MOBILE_APP_ID`** - As a report dimension (for filtering/grouping)

✅ **Available for**: Mobile applications only

✅ **Report Types**: Historical and Privacy/Messaging reports

✅ **Usage**: Add `MOBILE_APP_ID` to your dimensions array in report requests

## Next Steps

1. **Add `MOBILE_APP_ID` to dimensions** if you need app-level reporting
2. **Update data processing** to handle App ID field
3. **Update database schema** if you want to store App ID
4. **Create app-specific reports** if needed

