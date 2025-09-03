import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const AdManagerDataSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
        },
        adUnitName: {
            type: String,
            required: true,
        },
        impressions: {
            type: Number,
            default: 0,
        },
        clicks: {
            type: Number,
            default: 0,
        },
        revenue: {
            type: Number,
            default: 0,
        },
        cpm: {
            type: Number,
            default: 0,
        },
        ctr: {
            type: Number,
            default: 0,
        },
        site: {
            type: String,
            required: true,
        },
        reportId: {
            type: String,
            ref: 'adManagerReport',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

// Index for better query performance
AdManagerDataSchema.index({ date: 1, site: 1, adUnitName: 1 });
AdManagerDataSchema.index({ reportId: 1 });

AdManagerDataSchema.plugin(mongoosePaginate);

const AdManagerData = mongoose.model("adManagerData", AdManagerDataSchema);
export default AdManagerData;
