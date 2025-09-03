import { gql } from "apollo-server-express";

export default gql`

type CountryTable {
    id: ID
    site: String
    date: Date
    estimatedEarning: Number
    pageViews: Number
    pageRpm: Number
    impressions: Number
    impressionsRpm: Number
    activeViewViewable: Number
    country: String
    clicks: Number
   
}

type CountryTableRes {
    count: Number
    data: [CountryTable]
    sumWeek: Number
    sumYesterDay: Number
    sumMonth: Number
    country: String
    sum28Day:Number
    sumToday: Number
    sumOfTwoDates:Number
    previousMonthTotal:Number
}

input InCountryTable {
    site: String
    date: Date
    estimatedEarning: Number
    pageViews: Number
    pageRpm: Number
    country: String
    impressions: Number
    impressionsRpm: Number
    activeViewViewable: Number
    clicks: Number
    
}

input InUpCountryTable {
    id: ID
    site: String
    date: Date
    estimatedEarning: Number
    pageViews: Number
    pageRpm: Number
    country: String
    impressions: Number
    impressionsRpm: Number
    activeViewViewable: Number
    clicks: Number
}

extend type Query {
    getCountryTable(site: String,page: Number, limit: Number,,startDate: Date ,endDate:Date,userId: ID,siteId:ID): CountryTableRes
    getAllCountryTables(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String,startDate: Date ,endDate:Date):CountryTableRes
   
}

extend type Mutation {
    createCountryTable(input: InCountryTable):CountryTable
    updateCountryTable(input: InUpCountryTable):CountryTable
    deleteCountryTable(id: ID):Boolean
    importCountryTable(input: JSON!): String
}
`;