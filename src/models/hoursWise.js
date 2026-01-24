import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const HourStatsSchema = new mongoose.Schema(
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

const HoursWiseSchema = new mongoose.Schema(
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
    appId: { type: String, default: null, index: true },
    appName: { type: String, default: null },
    hours: {
      type: [HourStatsSchema],
      default: []
    },
  },
  {
    timestamps: true,
    collection: "hourwise" 
  }
);

HoursWiseSchema.index({ site: 1, date: -1 });
HoursWiseSchema.index({ appId: 1, date: -1 });

HoursWiseSchema.plugin(mongoosePaginate);

const HourWise = mongoose.model("HourWise", HoursWiseSchema);
export default HourWise;
