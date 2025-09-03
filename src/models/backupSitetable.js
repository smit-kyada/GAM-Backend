import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const backUpsiteTableSchema = new mongoose.Schema(
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
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
    }
);

backUpsiteTableSchema.plugin(mongoosePaginate);

const BackUpSiteTable = mongoose.model("backUpsiteTable", backUpsiteTableSchema);
export default BackUpSiteTable;