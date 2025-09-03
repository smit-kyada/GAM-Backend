import { gql } from "apollo-server-express";

export default gql`

type Queries {
    id: ID
    userId: User
    isRaised:Boolean
    message: String
}

type QueriesRes {
    count: Number
    data: [Queries]
}

input InQueries {
    userId: ID
    isRaised:Boolean
    message: String
}

input InUpQueries {
    id: ID
    userId: ID
    isRaised:Boolean
    message: String
}

extend type Query {
    getQueries(id: ID): Queries
    getQueriesByUserId(id: ID): Queries
    getAllQueries(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):QueriesRes
}

extend type Mutation {
    createQueries(input: InQueries):Queries
    updateQueries(input: InUpQueries):Queries
    deleteQueries(id: ID):Boolean
}
`;