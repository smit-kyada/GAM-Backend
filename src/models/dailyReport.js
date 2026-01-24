import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const CountryStatsSchema = new mongoose.Schema(
  {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    ecpm: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    costPerClick: { type: Number, default: 0 },
    matchRate: { type: Number, default: 0 },
  },
  { _id: false }
);
 
const DailyAdsManagerReportSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    site: { type: String, required: true, index: true },
    isDeleted: { type: Boolean, default: false },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    ecpm: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    costPerClick: { type: Number, default: 0 },
    matchRate: { type: Number, default: 0 },
    country:{ type:String, default:"" },
    appId: { type: String, default: null, index: true },
    appName: { type: String, default: null },
    countries: {
      type: Map,
      of: CountryStatsSchema,
      default: {}
    },
  },
  {
    timestamps: true,
    collection: "dailyadsmanagerreport" 
  }
);

DailyAdsManagerReportSchema.index({ site: 1, date: -1 });
DailyAdsManagerReportSchema.index({ appId: 1, date: -1 });

DailyAdsManagerReportSchema.plugin(mongoosePaginate);

const DailyAdsManagerReport = mongoose.model("DailyAdsManagerReport", DailyAdsManagerReportSchema);
export default DailyAdsManagerReport;
