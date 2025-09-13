import { gql } from "apollo-server-express";

import userSchema from "./user";
import siteTableSchema from './siteTable'
import siteSchema from './site'
import affRequestSchema from './affRequest'
import messageSchema from './message'
import gameUserSchema from './gameUser'
import messageLogSchema from './messageLog'
import bankDetailSchema from './bankDetail'
import notificationMessageSchema from './notificationMessage';
import ApplogSchema from './applog'
import DeductionSchema from './deduction'
import CountryTableSchema from './countryTable'
import AccountSchema from './account'
import AdsenseSchema from './adsense'
import AdManagerSchema from './adManager'
import ContactSchema from './contact'
import QueriesSchema from './queries'
import DailyAdsManagerReportSchema from './dailyReport'
import AdUnitReportSchema from './adUnitReport'

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
  AdUnitReportSchema
]