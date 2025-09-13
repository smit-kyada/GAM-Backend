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

const AdUnitSchema = new mongoose.Schema(
  {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    ecpm: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    costPerClick: { type: Number, default: 0 },
    matchRate: { type: Number, default: 0 },
    countries: {
      type: Map,
      of: CountryStatsSchema,
      default: {}
    }
  },
  { _id: false }
);

const AdUnitReportSchema = new mongoose.Schema(
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
    adUnits: {
      type: Map,
      of: AdUnitSchema,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: "adunitreport"
  }
);

AdUnitReportSchema.plugin(mongoosePaginate);

const AdUnitReport = mongoose.model("AdUnitReport", AdUnitReportSchema);

export default AdUnitReport;
