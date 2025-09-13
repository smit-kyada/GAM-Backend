import { gql } from "apollo-server-express";

export default gql`
  type CountryStats {
  impressions: Int
  clicks: Int
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Int
  costPerClick: Float
  matchRate: Float
}

type CountryEntry {
  country: String!
  stats: CountryStats!
}

type AdUnit {
  name: String!
  impressions: Int
  clicks: Int
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Int
  costPerClick: Float
  matchRate: Float
  countries: [CountryEntry!]
}

type AdUnitReport {
  id: ID!
  date: String!
  site: String!
  impressions: Int
  clicks: Int
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Int
  costPerClick: Float
  matchRate: Float
  adUnits: [AdUnit!]
}

type PaginatedAdUnitReports {
  totalDocs: Int!
  totalPages: Int!
  page: Int!
  docs: [AdUnitReport!]!
}

type Query {
  getAdUnitReports(
    site: String!
    startDate: String!
    endDate: String!
    page: Int!
    limit: Int!
  ): PaginatedAdUnitReports!
}
`;