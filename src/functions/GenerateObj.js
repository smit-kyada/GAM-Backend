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


export const GenerateAdsenseReportObj = (data) => {
    let Obj = {};
    Obj.site = data["DOMAIN_NAME"];
    Obj.date = data["DATE"];
    Obj.estimatedEarning = data["ESTIMATED_EARNINGS"] ? data["ESTIMATED_EARNINGS"] : 0;
    Obj.pageViews = data["PAGE_VIEWS"] ? data["PAGE_VIEWS"] : 0;
    Obj.pageRpm = data["PAGE_VIEWS_RPM"] ? data["PAGE_VIEWS_RPM"] : 0;
    Obj.impressions = data["IMPRESSIONS"] ? data["IMPRESSIONS"] : 0;
    Obj.impressionsRpm = data["IMPRESSIONS_RPM"] ? data["IMPRESSIONS_RPM"] : 0;
    Obj.activeViewViewable = data["ACTIVE_VIEW_VIEWABILITY"] ? data["ACTIVE_VIEW_VIEWABILITY"] : 0;
    Obj.clicks = data["CLICKS"] ? data["CLICKS"] : 0;

    return Obj
}

export const GenerateAdManagerReportObj = (data) => {
    let Obj = {};
    Obj.site = data["AD_EXCHANGE_DOMAIN"] || data["AD_UNIT_NAME"] || data["DOMAIN_NAME"];
    Obj.date = data["DATE"];
    Obj.estimatedEarning = data["AD_EXCHANGE_ESTIMATED_REVENUE"] ? data["AD_EXCHANGE_ESTIMATED_REVENUE"] : (data["TOTAL_REVENUE"] ? data["TOTAL_REVENUE"] : 0);
    Obj.pageViews = 0;
    Obj.pageRpm = data["AD_EXCHANGE_ECPM"] ? data["AD_EXCHANGE_ECPM"] : 0;
    Obj.impressions = data["AD_EXCHANGE_IMPRESSIONS"] ? data["AD_EXCHANGE_IMPRESSIONS"] : (data["TOTAL_INVENTORY_LEVEL_IMPRESSIONS"] ? data["TOTAL_INVENTORY_LEVEL_IMPRESSIONS"] : 0);
    Obj.impressionsRpm = data["AD_EXCHANGE_ECPM"] ? data["AD_EXCHANGE_ECPM"] : 0;
    Obj.activeViewViewable = data["AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS"] ? data["AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS"] : 0;
    Obj.clicks = data["AD_EXCHANGE_CLICKS"] ? data["AD_EXCHANGE_CLICKS"] : (data["TOTAL_CLICKS"] ? data["TOTAL_CLICKS"] : 0);

    return Obj
}
