import { gql } from "apollo-server-express";

export default gql`
type AdManager {
    id: ID
    access_token: String
    refresh_token: String
    scope: String
    id_token: String
    token_type: String
    expiry_date: Number
    authUrl: String
    isActive: Boolean
}

type AdManagerReport {
    id: ID
    reportId: String
    profileId: String
    name: String
    type: String
    format: String
    status: String
    dateRange: String
    dimensions: [String]
    metrics: [String]
    createdAt: String
    updatedAt: String
}

type AdManagerData {
    id: ID
    date: String
    adUnitName: String
    impressions: Number
    clicks: Number
    revenue: Number
    cpm: Number
    ctr: Number
    site: String
    createdAt: String
}

type AdManagerRes {
    count: Number
    data: [AdManager]
}

type AdManagerReportRes {
    count: Number
    data: [AdManagerReport]
}

type AdManagerDataRes {
    count: Number
    data: [AdManagerData]
}

input InAdManager {
    access_token: String
    refresh_token: String
    scope: String
    id_token: String
    token_type: String
    expiry_date: Number
    authUrl: String
    isActive: Boolean
}

input InUpAdManager {
    id: ID
    access_token: String
    refresh_token: String
    scope: String
    id_token: String
    token_type: String
    expiry_date: Number
    authUrl: String
    isActive: Boolean
}

input InAdManagerReport {
    reportId: String
    profileId: String
    name: String
    type: String
    format: String
    status: String
    dateRange: String
    dimensions: [String]
    metrics: [String]
}

input InAdManagerData {
    date: String
    adUnitName: String
    impressions: Number
    clicks: Number
    revenue: Number
    cpm: Number
    ctr: Number
    site: String
}

extend type Query {
    getAdManager(id: ID): AdManager
    getAllAdManagers(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String): AdManagerRes
    
    getAdManagerReport(id: ID): AdManagerReport
    getAllAdManagerReports(page: Number, limit: Number, profileId: String): AdManagerReportRes
    
    getAdManagerData(id: ID): AdManagerData
    getAllAdManagerData(page: Number, limit: Number, date: String, site: String): AdManagerDataRes
}

extend type Mutation {
    createAdManager(input: InAdManager): AdManager
    updateAdManager(input: InUpAdManager): AdManager
    deleteAdManager(id: ID): Boolean
    
    createAdManagerReport(input: InAdManagerReport): AdManagerReport
    updateAdManagerReport(input: InAdManagerReport): AdManagerReport
    deleteAdManagerReport(id: ID): Boolean
    
    createAdManagerData(input: InAdManagerData): AdManagerData
    updateAdManagerData(input: InAdManagerData): AdManagerData
    deleteAdManagerData(id: ID): Boolean
    
    generateAdManagerReport(dateRange: String, dimensions: [String], metrics: [String]): Boolean
}
`;
