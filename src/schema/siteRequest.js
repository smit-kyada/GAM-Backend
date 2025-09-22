import { gql } from "apollo-server-express";

export default gql`
    type SiteRequest {
        id: ID!
        userId: User
        siteId: Site
        requestedSite: String
        requestedDescription: String
        status: String
        requestMessage: String
        adminResponse: String
        reviewedBy: User
        reviewedAt: String
        createdSiteId: Site
        createdAt: String
        updatedAt: String
    }

    input SiteRequestInput {
        requestedSite: String!
        requestedDescription: String
        requestMessage: String
    }

    input SiteRequestReviewInput {
        id: ID!
        status: String!
        adminResponse: String
    }

    type SiteRequestResponse {
        count: Int
        data: [SiteRequest]
    }

    extend type Query {
        getSiteRequests(page: Int, limit: Int, search: String, filter: String): SiteRequestResponse
        getMySiteRequests(page: Int, limit: Int, search: String, filter: String): SiteRequestResponse
        getSiteRequest(id: ID!): SiteRequest
    }

    extend type Mutation {
        createSiteRequest(input: SiteRequestInput): SiteRequest
        reviewSiteRequest(input: SiteRequestReviewInput): SiteRequest
        deleteSiteRequest(id: ID!): Boolean
    }
`;
