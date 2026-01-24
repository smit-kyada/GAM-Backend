import { gql } from "apollo-server-express";

export default gql`
  type ReportPresetData {
    breakdowns: [String!]
    sites: [String!]
    countries: [String!]
    adUnits: [String!]
  }

  type ReportPreset {
    id: ID
    reportId: String
    title: String
    description: String
    icon: String
    isUnsaved: Boolean
    isUserCreated: Boolean
    presets: ReportPresetData
    order: Number
    userId: User
    createdAt: Date
    updatedAt: Date
  }

  input ReportPresetDataInput {
    breakdowns: [String!]
    sites: [String!]
    countries: [String!]
    adUnits: [String!]
  }

  input ReportPresetInput {
    reportId: String!
    title: String!
    description: String
    icon: String
    isUnsaved: Boolean
    isUserCreated: Boolean
    presets: ReportPresetDataInput!
    order: Number
  }

  extend type Query {
    getReportPresets: [ReportPreset!]!
  }

  extend type Mutation {
    saveReportPresets(reports: [ReportPresetInput!]!): [ReportPreset!]!
    updateReportPreset(reportId: String!, presets: ReportPresetDataInput!): ReportPreset
    deleteReportPreset(reportId: String!): ReportPreset
  }
`;

