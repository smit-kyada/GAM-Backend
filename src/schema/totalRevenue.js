import { gql } from "apollo-server-express";

export default gql`
type TotalRevenueData {
  date: String!
  totalRevenue: Float!
  totalImpressions: Float!
  totalClicks: Float!
  totalRequests: Float!
  ctr: Float!
  ecpm: Float!
  costPerClick: Float!
  matchRate: Float!
  siteCount: Int!
  sites: [String!]!
}

type TotalRevenueSummary {
  totalRevenue: Float!
  totalImpressions: Float!
  totalClicks: Float!
  totalRequests: Float!
  averageCtr: Float!
  averageEcpm: Float!
  averageCostPerClick: Float!
  averageMatchRate: Float!
  totalDays: Int!
  dateRange: String!
}

type TotalRevenueResponse {
  summary: TotalRevenueSummary!
  dailyData: [TotalRevenueData!]!
}

type Query {
  getTotalRevenueData(
    sites: [String!]
    days: Int
  ): TotalRevenueResponse!
}
`;
