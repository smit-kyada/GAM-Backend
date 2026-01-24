// CommonJS module for Ad Manager report generation
import async from 'async';
import { AdManagerConvert } from './AdManagerConvert.js';
import { GenerateAdManagerReportObj } from './GenerateObj.js';
import models from '../models/index.js';
import GAMClientPythonBridge from './gamClientPythonBridge.js';

/**
 * Generate Ad Manager report using Python Bridge
 * @returns {Promise} - Promise resolving to report data
 */

const GenerateAdManagerReport = async () => {
    try {
        console.log("✅ Starting Ad Manager report generation using Python Bridge...");

        // Create report query for Ad Manager using parameters or defaults
        // NOTE: googleads ReportService expects startDate/endDate when using the Python bridge.
        // We'll always send CUSTOM_DATE to avoid [NotNullError.NULL @ reportQuery.startDate].
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6); // last 7 days inclusive

        const reportQuery = {
            // Use SITE_NAME + line-item-level Ad Exchange columns (these are confirmed working with v202505 via Python bridge)
            dimensions: ["SITE_NAME", "DATE", "COUNTRY_NAME", 'MOBILE_APP_RESOLVED_ID', 'MOBILE_APP_NAME', 'MOBILE_INVENTORY_TYPE', 'INVENTORY_FORMAT', 'LINE_ITEM_NAME', 'DOMAIN'],
            columns: [
                "AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE",
                "AD_EXCHANGE_LINE_ITEM_LEVEL_IMPRESSIONS",
                "AD_EXCHANGE_LINE_ITEM_LEVEL_CLICKS",
                "AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM"
            ],
            dateRangeType: "CUSTOM_DATE",
            startDate: {
                year: startDate.getFullYear(),
                month: startDate.getMonth() + 1,  
                day: startDate.getDate()
            },
            endDate: {
                year: endDate.getFullYear(),
                month: endDate.getMonth() + 1,
                day: endDate.getDate()
            }
        };

        try {
            // Call Ad Manager Report Service via Python Bridge
            console.log("📊 Fetching Ad Manager report data...");
            const gamClient = new GAMClientPythonBridge();
            const rawData = await gamClient.fetchReportData(reportQuery);
            
            // Convert Python bridge object array format to array-of-arrays format for AdManagerConvert
            if (!rawData || rawData.length === 0) {
                console.log("No data returned from Python bridge");
                return { status: false, message: "No data returned from Ad Manager API" };
            }
            
            // Normalize Python bridge keys:
            // - CSV headers often come back as "Dimension.X" and "Column.Y"
            // - Our JS pipeline expects plain "X" and "Y"
            const normalizeRow = (row) => {
                const out = {};
                for (const [k, v] of Object.entries(row || {})) {
                    const nk = k.replace(/^Dimension\./, '').replace(/^Column\./, '');
                    out[nk] = v;
                }
                return out;
            };

            const normalizedRows = rawData.map(normalizeRow);
            const headers = [...reportQuery.dimensions, ...reportQuery.columns];
            const reportData = [
                headers,
                ...normalizedRows.map(row => headers.map(header => row?.[header] ?? ''))
            ];
            
            const gamData = AdManagerConvert(reportData);
            console.log("📊 gamData total count:", gamData?.total?.length || 0);
            let counter = 0;
            return await async.eachSeries(
                gamData?.total,
                async (data, cb) => {
                    let SiteTableData = GenerateAdManagerReportObj(data);
                    const dates = SiteTableData?.date;

                    if (typeof dates == "string" && dates?.includes("-")) {
                        const dateString = SiteTableData?.date;
                        const [year, month, day] = dateString?.split("-");
                        const date = new Date(`${year}`, month - 1, day);
                        SiteTableData.date = date;

                        await models?.SiteTable?.findOneAndUpdate({ site: SiteTableData?.site, date, isDeleted: false }, SiteTableData, { upsert: true, new: true })
                            .then(async () => { counter++; })
                            .catch((err) => { console.log("gam upsert err:", err) })
                    }

                    if (cb) cb();
                }, async (err) => {
                    if (err) {
                        await models?.Applog?.create({ title: "Generate GAM Report Error", logFor: JSON.stringify(err) })
                            .catch(() => { })
                    }
                    else if (gamData?.total?.length === counter) {
                        await models?.Applog?.create({ title: "Report Auto Generate", logFor: "Generate GAM Report" })
                            .catch(() => { })
                    }
                }
            );
        } catch (apiError) {
            console.log("Ad Manager API error:", apiError.message);
            // Log the error
            await models?.Applog?.create({ 
                title: "Ad Manager API Error", 
                logFor: JSON.stringify(apiError) 
            }).catch(() => {});
            
            return { status: false, message: "Ad Manager report generation failed due to API error", error: apiError.message };
        }
    } catch (error) {
        console.log("GenerateAdManagerReport error:", error);
        await models?.Applog?.create({ title: "Generate GAM Report Error", logFor: JSON.stringify(error) })
            .catch(() => {});
        
        return { status: false, message: "Ad Manager report generation failed", error: error.message };
    }
};

// Build Ad Manager query string
const buildAdManagerQuery = (reportQuery) => {
    const dimensions = reportQuery.dimensions.join(', ');
    const columns = reportQuery.columns.join(', ');
    
    return `
        SELECT 
            ${dimensions}, 
            ${columns}
        FROM ad_exchange_performance_report 
        WHERE segments.date BETWEEN '${reportQuery.dateRangeType === 'LAST_7_DAYS' ? '7daysAgo' : 'yesterday'}' AND 'today'
        ORDER BY segments.date DESC
    `.trim();
};

export {
    GenerateAdManagerReport,
    buildAdManagerQuery
};