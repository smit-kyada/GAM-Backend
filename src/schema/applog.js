import { gql } from "apollo-server-express";

export default gql`

type Applog {
    id:ID
    userId:User
    title:String
    logFor:String
    createdAt:Date
}

type ApplogRes{
    count:Number
    data:[Applog]
}

input InApplog{
    userId:ID
    title:String
    logFor:String
}

extend type Query {
    getApplog(id:ID):Applog
    getLastApplog(id:ID):Applog
    getAllApplog(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):ApplogRes
}

extend type Mutation {
    createApplog(input:InApplog):Applog
    deleteApplog(id:ID):Boolean
}

`;