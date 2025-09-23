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

type DailyAdsManagerReport {
  id: ID!
  date: String
  site: String!
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
  country: String
  countries: [CountryEntry!]
}
type ReportTotals {
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
}

type PaginatedReports {
  totalDocs: Int!
  totalPages: Int!
  page: Int!
  docs: [DailyAdsManagerReport!]!
  totals: ReportTotals
}

type DailyReportCSVData {
  csvData: String!
  totalRecords: Int!
  totals: ReportTotals
}

type DailyReportCSVRow {
  site: String!
  date: String!
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
  getReports(
    site: [String!]
    country: [String]
    startDate: String!
    endDate: String!
    page: Int!
    limit: Int!
    byDated: Boolean!
  ): PaginatedReports!
}

type Mutation {
  downloadDailyReportCSV(
    site: [String!]
    country: [String]
    startDate: String!
    endDate: String!
    byDated: Boolean!
  ): DailyReportCSVData!
}
`;