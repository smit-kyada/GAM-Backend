import { gql } from "apollo-server-express";

export default gql`
type CountryStats {
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
}

type CountryEntry {
  country: String!
  stats: CountryStats!
}

type AdUnit {
  name: String!
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
  countries: [CountryEntry!]
}

type AdUnitReport {
  id: ID!
  date: String!
  site: String!
  name: String
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
  country: String
  adUnits: [AdUnit!]
}

type AdUnitReportTotals {
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
}

type PaginatedAdUnitReports {
  totalDocs: Int!
  totalPages: Int!
  page: Int!
  docs: [AdUnitReport!]!
  totals: AdUnitReportTotals
}

type AdUnitReportCSVData {
  csvData: String!
  totalRecords: Int!
  totals: AdUnitReportTotals
}

type AdUnitReportCSVRow {
  site: String!
  date: String!
  name: String!
  country: String!
  impressions: Float!
  clicks: Float!
  ctr: Float!
  ecpm: Float!
  revenue: Float!
  totalRequests: Float!
  costPerClick: Float!
  matchRate: Float!
}

type Query {
  getAdUnitReports(
    site: [String!]
    country: [String]
    startDate: String!
    endDate: String!
    page: Int!
    limit: Int!
    byDated: Boolean!
  ): PaginatedAdUnitReports!
}

type Mutation {
  downloadAdUnitReportCSV(
    site: [String!]
    country: [String]
    startDate: String!
    endDate: String!
    byDated: Boolean!
  ): AdUnitReportCSVData!
}
`;