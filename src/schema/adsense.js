import { gql } from "apollo-server-express";

export default gql`

type Adsense {
    id: ID
    access_token:String
    refresh_token:String
    scope:String
    id_token:String
    token_type:String
    expiry_date:Number
    authUrl:String
    isActive:Boolean
}

type AdsenseRes {
    count: Number
    data: [Adsense]
}

input InAdsense {
    access_token:String
    refresh_token:String
    scope:String
    id_token:String
    token_type:String
    expiry_date:Number
    authUrl:String
    isActive:Boolean
}


input InUpAdsense {
    id: ID
    access_token:String
    refresh_token:String
    scope:String
    id_token:String
    token_type:String
    expiry_date:Number
    authUrl:String
    isActive:Boolean
}

extend type Query {
    getAdsense(id: ID): Adsense
    getAllAdsenses(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):AdsenseRes
}

extend type Mutation {
    createAdsense(input: InAdsense):Adsense
    updateAdsense(input: InUpAdsense):Adsense
    deleteAdsense(id: ID):Boolean
}
`;