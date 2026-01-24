export const GenerateUserObj = (data) => {
    let Obj = {}
    Obj.userName = data.userName;
    Obj.email = data.email;
    Obj.contact = data.contact;
}

export const GenerateSiteTableObj = (data) => {
    let Obj = {};
    Obj.site = data["Site"];
    Obj.date = data["Date"];
    Obj.estimatedEarning = data["Estimated earnings (USD)"] ? data["Estimated earnings (USD)"] : 0;
    Obj.pageViews = data["Page views"] ? data["Page views"] : 0;
    Obj.pageRpm = data["Page RPM (USD)"] ? data["Page RPM (USD)"] : 0;
    Obj.impressions = data["Impressions"] ? data["Impressions"] : 0;
    Obj.impressionsRpm = data["Impression RPM (USD)"] ? data["Impression RPM (USD)"] : 0;
    Obj.activeViewViewable = data["Active View Viewable"] ? data["Active View Viewable"] : 0;
    Obj.clicks = data["Clicks"] ? data["Clicks"] : 0;

    return Obj
}

export const GenerateCountryTableObj = (data) => {

    let Obj = {}
    Obj.site = data["Site"];
    Obj.date = data["Date"];
    Obj.estimatedEarning = data["Estimated earnings (USD)"] ? data["Estimated earnings (USD)"] : 0;
    Obj.pageViews = data["Page views"] ? data["Page views"] : 0;
    Obj.pageRpm = data["Page RPM (USD)"] ? data["Page RPM (USD)"] : 0;
    Obj.country = data["Country"] ? data["Country"] : 0;
    Obj.impressions = data["Impressions"] ? data["Impressions"] : 0;
    Obj.impressionsRpm = data["Impression RPM (USD)"] ? data["Impression RPM (USD)"] : 0;
    Obj.activeViewViewable = data["Active View Viewable"] ? data["Active View Viewable"] : 0;
    Obj.clicks = data["Clicks"] ? data["Clicks"] : 0;



    return Obj
}

export const GenerateDeductionObj = (data) => {
    let Obj = {}
    Obj.site_link = data["Site"];
    Obj.date = data["Date"];
    Obj.deduction = data["Estimated earnings (USD)"] ? data["Estimated earnings (USD)"] : 0;



    return Obj
}


export const GenerateAdManagerReportObj = (data) => {
    let Obj = {};
    Obj.site = data["AD_EXCHANGE_DOMAIN"] || data["SITE_NAME"] || data["AD_UNIT_NAME"] || data["DOMAIN_NAME"];
    Obj.date = data["DATE"];
    // Revenue can come from different GAM reports:
    // - AD_EXCHANGE_ESTIMATED_REVENUE: currency units (string/number)
    // - AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE: micros (string/number)
    const revenueEstimated = data["AD_EXCHANGE_ESTIMATED_REVENUE"];
    const revenueTotal = data["TOTAL_REVENUE"];
    const revenueLineItemMicros = data["AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE"];
    let revenue = 0;
    if (revenueEstimated !== undefined && revenueEstimated !== null && revenueEstimated !== "") {
        revenue = parseFloat(revenueEstimated) || 0;
    } else if (revenueLineItemMicros !== undefined && revenueLineItemMicros !== null && revenueLineItemMicros !== "") {
        // Convert micros -> currency units
        revenue = (parseFloat(revenueLineItemMicros) || 0) / 1000000;
    } else if (revenueTotal !== undefined && revenueTotal !== null && revenueTotal !== "") {
        revenue = parseFloat(revenueTotal) || 0;
    }
    Obj.estimatedEarning = revenue;
    Obj.pageViews = 0;
    const impressions =
        (parseFloat(data["AD_EXCHANGE_IMPRESSIONS"]) || 0) ||
        (parseFloat(data["AD_EXCHANGE_LINE_ITEM_LEVEL_IMPRESSIONS"]) || 0) ||
        (parseFloat(data["TOTAL_INVENTORY_LEVEL_IMPRESSIONS"]) || 0) ||
        0;
    Obj.impressions = impressions;

    const clicks =
        (parseFloat(data["AD_EXCHANGE_CLICKS"]) || 0) ||
        (parseFloat(data["AD_EXCHANGE_LINE_ITEM_LEVEL_CLICKS"]) || 0) ||
        (parseFloat(data["TOTAL_CLICKS"]) || 0) ||
        0;
    Obj.clicks = clicks;

    // Prefer direct eCPM if available; otherwise compute from revenue + impressions
    const ecpmDirect =
        (parseFloat(data["AD_EXCHANGE_ECPM"]) || 0) ||
        (parseFloat(data["AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM"]) || 0) ||
        0;
    const ecpmComputed = impressions > 0 ? (revenue / impressions) * 1000 : 0;
    const ecpm = ecpmDirect || ecpmComputed;
    Obj.pageRpm = ecpm;
    Obj.impressionsRpm = ecpm;
    Obj.activeViewViewable = data["AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS"] ? data["AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS"] : 0;
    // App ID fields from GAM API
    Obj.appId = data["MOBILE_APP_ID"] || data["APPLICATION_CODE"] || null;
    Obj.appName = data["MOBILE_APP_NAME"] || data["APPLICATION_NAME"] || null;

    return Obj
}
