import { gql } from "apollo-server-express";

export default gql`

type Deductions {
    id: ID
    date:Date
    site_link:String
    deduction:Number
    SiteTableData:Number
   
}

type DeductionsRes {
    count: Number
    data: [Deductions]
    sumWeek: Number
    sumYesterDay: Number
    sumMonth: Number
    sum28Day:Number
    sumToday: Number
    totalErnings:Number
    totalDeduction:Number
    previousMonthTotal:Number
}

input InDeductions {
    site_link:String
    deduction:Number
}

input InUpDeductions {
    id: ID
    site_link:String
    deduction:Number
}

extend type Query {
    getDeduction(site: String,page: Number, limit: Number,,startDate: Date ,endDate:Date): DeductionsRes
    getAllDeduction(page: Number, limit: Number, isSearch: Boolean, filter: String, search: String,startDate: Date ,endDate:Date):DeductionsRes
   
}

extend type Mutation {
    createDeduction(input: InDeductions):Deductions
    updateDeduction(input: InUpDeductions):Deductions
    deleteDeduction(id: ID):Boolean
    importDeduction(input: JSON!): String
}
`;