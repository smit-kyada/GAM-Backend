import { gql } from "apollo-server-express";

export default gql`
type TotalUser{
    TotalgameUsers: Number
}

type Site {
    id: ID
    site: String
    userId: User
    description: String   
    gameUsers: TotalUser
    isActive: Boolean
}

type SiteRes {
    count: Number
    data: [Site]
}

input InSite {
    site: String
    userId: ID 
    password: String
    description: String     
    isActive: Boolean
}

input InUpSite {
    id: ID
    site: String
    password: String
    description: String   
    userId: ID   
    isActive: Boolean
}

extend type Query {
    getSite(id: ID): [Site]
    getAllSites(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):SiteRes
    getAlotSiteBoolean(id: ID):Boolean
    getNotAllotedSite(id:ID):[Site]
}

extend type Mutation {
    createSite(input: InSite):Site
    updateSite(input: InUpSite):Site
    updateUserSite(input: InUpSite):Site
    createSitePassword(id: ID ,password: String): Boolean
    deleteSite(id: ID):Boolean
}
`;