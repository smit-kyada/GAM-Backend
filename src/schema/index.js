import { gql } from "apollo-server-express";

import userSchema from "./user.js";
import siteTableSchema from './siteTable.js'
import siteSchema from './site.js'
import affRequestSchema from './affRequest.js'
import messageSchema from './message.js'
import gameUserSchema from './gameUser.js'
import messageLogSchema from './messageLog.js'
import bankDetailSchema from './bankDetail.js'
import notificationMessageSchema from './notificationMessage.js';
import ApplogSchema from './applog.js'
import DeductionSchema from './deduction.js'
import CountryTableSchema from './countryTable.js'
import AccountSchema from './account.js'
import AdsenseSchema from './adsense.js'
import AdManagerSchema from './adManager.js'
import ContactSchema from './contact.js'
import QueriesSchema from './queries.js'
import DailyAdsManagerReportSchema from './dailyReport.js'
import AdUnitReportSchema from './adUnitReport.js'
import HoursWiseSchema from './hoursWise.js'
import TotalRevenueSchema from './totalRevenue.js'

const linkSchema = gql`
  scalar Date
  scalar JSON
  scalar Number

  input LogInput {
    action: String
    actionOn: String
    actionName: String
    oldValue: String
    message: String
  }

  input Sort {
    key: String
    type: Int
  }

  type Query {
    _: Boolean
  }

  type Mutation {
    _: Boolean
  }
`;

export default [
  linkSchema,
  userSchema,
  siteTableSchema,
  siteSchema,
  affRequestSchema,
  messageSchema,
  gameUserSchema,
  messageLogSchema,
  bankDetailSchema,
  notificationMessageSchema,
  ApplogSchema,
  DeductionSchema,
  CountryTableSchema,
  AccountSchema,
  AdsenseSchema,
  AdManagerSchema,
  ContactSchema,
  QueriesSchema,
  DailyAdsManagerReportSchema,
  AdUnitReportSchema,
  HoursWiseSchema,
  TotalRevenueSchema
]