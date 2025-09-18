import { gql } from "apollo-server-express";

export default gql`

type HourStats {
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
}

type HoursWise {
  id: ID!
  date: String
  site: String!
  hour: Int
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
}

type HoursWiseTotals {
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
}

type PaginatedHoursWise {
  totalDocs: Int!
  totalPages: Int!
  page: Int!
  docs: [HoursWise!]!
  totals: HoursWiseTotals
}

type Query {
  getHoursWiseReports(
    site: [String!]
    startDate: String!
    endDate: String!
    page: Int!
    limit: Int!
  ): PaginatedHoursWise!
  
  getHoursWiseById(id: ID!): HoursWise
}

type Mutation {
  createHoursWiseReport(
    date: String!
    site: String!
    impressions: Float
    clicks: Float
    ctr: Float
    ecpm: Float
    revenue: Float
    totalRequests: Float
    costPerClick: Float
    matchRate: Float
    hours: [HourStatsInput!]
  ): HoursWise!
  
  updateHoursWiseReport(
    id: ID!
    date: String
    site: String
    impressions: Float
    clicks: Float
    ctr: Float
    ecpm: Float
    revenue: Float
    totalRequests: Float
    costPerClick: Float
    matchRate: Float
    hours: [HourStatsInput!]
  ): HoursWise!
  
  deleteHoursWiseReport(id: ID!): Boolean!
}

input HourStatsInput {
  impressions: Float
  clicks: Float
  ctr: Float
  ecpm: Float
  revenue: Float
  totalRequests: Float
  costPerClick: Float
  matchRate: Float
}
`;
