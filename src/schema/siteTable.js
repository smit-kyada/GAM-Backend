import { gql } from "apollo-server-express";

export default gql`

type SiteTable {
    id: ID
    site: String
    date: Date
    estimatedEarning: Number
    pageViews: Number
    pageRpm: Number
    impressions: Number
    impressionsRpm: Number
    activeViewViewable: Number
    clicks: Number
   
}

type SiteTableRes {
    count: Number
    data: [SiteTable]
    sumWeek: Number
    sumYesterDay: Number
    sumMonth: Number
    sum28Day:Number
    sumToday: Number
    sumOfTwoDates:Number
    previousMonthTotal:Number
}

input InSiteTable {
    site: String
    date: Date
    estimatedEarning: Number
    pageViews: Number
    pageRpm: Number
    impressions: Number
    impressionsRpm: Number
    activeViewViewable: Number
    clicks: Number
    
}

input InUpSiteTable {
    id: ID
    site: String
    date: Date
    estimatedEarning: Number
    pageViews: Number
    pageRpm: Number
    impressions: Number
    impressionsRpm: Number
    activeViewViewable: Number
    clicks: Number
}

type SiteTableTotalObj{
    id:String
    DOMAIN_NAME:String
    COUNTRY_CODE:String
    COUNTRY_NAME:String
    DATE:String
    IMPRESSIONS:String
    CLICKS:String
    PAGE_VIEWS:String
    ESTIMATED_EARNINGS:String
    PAGE_VIEWS_RPM:String
    IMPRESSIONS_RPM:String
    ACTIVE_VIEW_VIEWABILITY:String
}

type SiteTableTotal {
    total:SiteTableTotalObj
}

type SiteTableReport{
    total:[SiteTableTotalObj]
}

type SitetableReportRes {
    TODAY:SiteTableTotal
    YESTERDAY:SiteTableTotal
    LAST_7_DAYS:SiteTableTotal
    MONTH_TO_DATE:SiteTableTotal
    LAST_MONTH:SiteTableTotal
    YEAR_TO_DATE:SiteTableReport
}

extend type Query {
    getSiteTable(site: String,page: Number, limit: Number,startDate: Date ,endDate:Date,userId: ID,siteId:ID, fetchAll: Boolean): SiteTableRes
    getSiteReportSiteTable(site: String,page: Number, limit: Number,,startDate: Date ,endDate:Date,siteId:ID): SiteTableRes
    getAllSiteTables(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String,startDate: Date ,endDate:Date):SiteTableRes
    getUserSiteTableReport(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String,startDate: Date ,endDate:Date):SiteTableRes
    getSiteTableReport(page: Number, limit: Number, filter: String, isSearch: Boolean, search: String): SitetableReportRes
    getDashBoardData(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String,startDate: Date ,endDate:Date):String
}

extend type Mutation {
    createSiteTable(input: InSiteTable):SiteTable
    updateSiteTable(input: InUpSiteTable):SiteTable
    deleteSiteTable(id: ID):Boolean
    importSiteTable(input: JSON!): String
}
`;