import { gql } from "apollo-server-express";

export default gql`

type User {
    id: ID
    userName:String
    companyName:String
    fName:String
    lName:String
    emailOTP: Number
    phoneOTP: Number
    phoneOtpExpiry: Number
    email:String
    contact: Number
    isEmailVerified:Boolean
    role:String
    profileImg:String
    showTotalGameUser:Boolean
    isPolicyAccept:Boolean
    block:Boolean
    users:[User]
    isActive: Boolean
    isOnlyReport: Boolean
    showReport: Boolean
    showAllData: Boolean
    isAdmin: Boolean
    adminToken:String
    registerOtp:Number
    registerOtpExpiry:Number
    registerVerified:Boolean
    companyAddress:String
    Designation:String
    pincode:Number
}

type AdsenseReportObj{
    id:String
    DOMAIN_NAME:String
    COUNTRY_CODE:String
    COUNTRY_NAME:String
    DATE:String
    IMPRESSIONS:String
    CLICKS:String
    PAGE_VIEWS:String
    ESTIMATED_EARNINGS:String
    PAGE_VIEWS_RPM:String
    IMPRESSIONS_RPM:String
    ACTIVE_VIEW_VIEWABILITY:String
}
type AdsenseTotalReport{
  
    ESTIMATED_EARNINGS:String
}

type AdsenseTotal{
    total:AdsenseTotalReport
}

type AdsenseReport{
    total:[AdsenseReportObj]
}

type AdsenseFullReportRes{
    YEAR_TO_DATE:AdsenseReport 
}


type AdsenseReportRes {
    TODAY:AdsenseTotal
    YESTERDAY:AdsenseTotal
    LAST_7_DAYS:AdsenseTotal
    MONTH_TO_DATE:AdsenseTotal
    LAST_MONTH:AdsenseTotal
    YEAR_TO_DATE:AdsenseReport
    DATE_RANGE:AdsenseTotal

}

type UserRes {
    count: Number
    data: [User]
}

type UserToken {
    token: String
    user: User
}

input InUser {
    userName:String
    email:String
    password:String
    contact: Number
    role:String
    isEmailVerified:Boolean
    showTotalGameUser:Boolean
    isPolicyAccept:Boolean
    block:Boolean
    users:[ID]
    isActive: Boolean
    isOnlyReport: Boolean
    showReport: Boolean
    showAllData: Boolean
    adminToken:String
    companyName:String
    fName:String
    lName:String
    emailOTP: Number
    phoneOTP: Number
    phoneOtpExpiry: Number
    registerOtp:Number
    registerOtpExpiry:Number
    registerVerified:Boolean
    companyAddress:String
    Designation:String
    pincode:Number
}

type RegisterRes{
    status:Boolean,
    message:String,
    user:User
}

input InUpUser {
    id: ID
    userName:String
    email:String
    password:String
    contact: Number
    role:String
    isEmailVerified:Boolean
    showTotalGameUser:Boolean
    isPolicyAccept:Boolean
    block:Boolean
    users:[ID]
    isActive: Boolean
    isOnlyReport: Boolean
    showReport: Boolean
    showAllData: Boolean
    adminToken:String
    companyName:String
    fName:String
    lName:String
    emailOTP: Number
    phoneOTP: Number
    phoneOtpExpiry: Number
    registerOtp:Number
    registerOtpExpiry:Number
    registerVerified:Boolean
    companyAddress:String
    Designation:String
    pincode:Number
}



input InBlockUser {
    id: ID
    block:Boolean
}



input InActiveUser {
    id: ID
    isActive:Boolean
}



type GetMe{
    id: ID
    userName:String
    companyName:String
    fName:String
    lName:String
    emailOTP: Number
    phoneOTP: Number
    phoneOtpExpiry: Number
    email:String
    contact: Number
    isEmailVerified:Boolean
    role:String
    profileImg:String
    showTotalGameUser:Boolean
    isPolicyAccept:Boolean
    block:Boolean
    users:[User]
    isActive: Boolean
    isOnlyReport: Boolean
    showReport: Boolean
    showAllData: Boolean
    isAdmin: Boolean
    adminToken:String
    registerOtp:Number
    registerOtpExpiry:Number
    registerVerified:Boolean
}



input InRegisterOtp{
    userId:ID
    registerOtp:Number
}

input InLoginOtp{
    phoneOtp:Number
    userId:ID
}

type ResendOTP{
    link:String
    message:String
}

extend type Query {
    get_me: User
    getUser(id: ID): User
    getUserList(page: Number, limit: Number, filter: String, isSearch: Boolean, search: String): UserRes
    getSubAdminUser(page: Number, limit: Number, filter: String, isSearch: Boolean, search: String): UserRes
    getAdsenseTotalReport(page: Number, limit: Number, filter: String, isSearch: Boolean, search: String): AdsenseReportRes
    getAdsenseSiteTotalReport(page: Number, limit: Number, filter: String, isSearch: Boolean, search: String): AdsenseReportRes
    getAdsenseFullReport(page: Number, limit: Number, filter: String, isSearch: Boolean, search: String): AdsenseFullReportRes
    getAdsenseFullSiteReport(page: Number, limit: Number, filter: String, isSearch: Boolean, search: String): AdsenseFullReportRes
    getAdminToken(id:ID): String
    getJWTUserId(token:String): User
    IsUserBankAcc(id:ID):Boolean
}

extend type Mutation {
    register(input: InUser): String
    verifyRegisterOtp(input: InRegisterOtp): String
    verifyLoginOtp(input: InLoginOtp): UserToken
    verifyEmail(code:String ,id:ID):Boolean
    addUser(input: InUser): User
    login(email: String, password: String, isSideLogin: Boolean): UserToken
    loginWithMobile(email: String): String
    reSendOTP(id:ID,otpType:String): ResendOTP
    reSendVerificationEmail(email: String): String
    getMe(user: String): GetMe
    importUser(input: JSON!): String
    updatePassword(id: ID ,password: String): Boolean
    updateUser(input: InUpUser): User
    blockUser(input: InBlockUser): User
    inActiveUser(input: InActiveUser): User
    deleteUser(id: ID): Boolean
    forgotPassword(email: String): Boolean
    resetPassword(id: ID, code: String, password: String): Boolean
    generateAdminToken(id:ID): String
    genrateAdsenseExcel(input: String): String
    DownloadAgreement(input: String): String
}


`;