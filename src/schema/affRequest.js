import { gql } from "apollo-server-express";

export default gql`

type AffRequest {
    id: ID
    name: String
    email: String
    mobile: Number
    message: String
}

type AffRequestRes {
    count: Number
    data: [AffRequest]
}

input InAffRequest {
    name: String
    email: String
    mobile: Number
    message: String  
}

input InUpAffRequest {
    id: ID
    name: String
    email: String
    mobile: Number
    message: String
}

extend type Query {
    getAffRequest(id: ID): AffRequest
    getAllAffRequests(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):AffRequestRes
}

extend type Mutation {
    createAffRequest(input: InAffRequest):AffRequest
    updateAffRequest(input: InUpAffRequest):AffRequest
    deleteAffRequest(id: ID):Boolean
}
`;