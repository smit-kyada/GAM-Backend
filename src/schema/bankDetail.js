import { gql } from "apollo-server-express";

export default gql`

type BankDetail {
    id: ID
    bankName: String
    accNumber: String
    ifscCode: String
    swiftCode: String
    userId: User
}

type BankDetailRes {
    count: Number
    data: [BankDetail]
}

input InBankDetail {
    bankName: String
    accNumber: String
    ifscCode: String
    swiftCode: String
    userId: ID
}

input InUpBankDetail {
    id: ID
    userId: ID
    bankName: String
    accNumber: String
    ifscCode: String
    swiftCode: String
}

extend type Query {
    getBankDetail(id: ID): BankDetailRes
    getAllBankDetails(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String):BankDetailRes
}

extend type Mutation {
    createBankDetail(input: InBankDetail):BankDetail
    updateBankDetail(input: InUpBankDetail):BankDetail
    deleteBankDetail(id: ID):Boolean
}
`;