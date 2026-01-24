import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const siteTableSchema = new mongoose.Schema(
    {
        site: {
            type: String
        },
        date: {
            type: Date,
        },
        estimatedEarning: {
            type: Number,
        },
        pageViews: {
            type: Number,
        },
        pageRpm: {
            type: Number,
        },
        impressions: {
            type: Number,
        },
        impressionsRpm: {
            type: Number,
        },
        activeViewViewable: {
            type: Number,
        },
        clicks: {
            type: Number,
        },
        appId: {
            type: String,
            default: null,
            index: true
        },
        appName: {
            type: String,
            default: null
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
    }
);

siteTableSchema.index({ site: 1, date: -1 });
siteTableSchema.index({ appId: 1, date: -1 });

siteTableSchema.plugin(mongoosePaginate);

const SiteTable = mongoose.model("siteTable", siteTableSchema);
export default SiteTable;