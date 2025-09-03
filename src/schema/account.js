import { gql } from "apollo-server-express";

export default gql`

type Account {
    id: ID
    userId: User
    bankName:String
    IFSC:String
    accountHolderName:String
    accountNumber:String
    accountType:String
    GstNumber:String
    GstCertificate:String
    active:Boolean
}

type AccountRes {
    count: Number
    data: [Account]
}

input InAccount {
    userId: ID
    bankName:String
    IFSC:String
    accountHolderName:String
    accountNumber:String
    accountType:String
    GstNumber:String
    GstCertificate:String
    active:Boolean
}


input InUpAccount {
    id: ID
    userId: ID
    bankName:String
    IFSC:String
    accountHolderName:String
    accountNumber:String
    accountType:String
    GstNumber:String
    GstCertificate:String
    OldGstCertificate:String
    active:Boolean
}

extend type Query {
    getAccount(id: ID): Account
    getAllAccounts(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):AccountRes
}

extend type Mutation {
    createAccount(input: InAccount):Account
    updateAccount(input: InUpAccount):Account
    deleteAccount(id: ID):Boolean
}
`;