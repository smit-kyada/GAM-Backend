import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const reportPresetSchema = new mongoose.Schema(
    {
        reportId: {
            type: String,
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        icon: {
            type: String,
            default: 'lightning'
        },
        isUnsaved: {
            type: Boolean,
            default: false
        },
        isUserCreated: {
            type: Boolean,
            default: false
        },
        presets: {
            breakdowns: {
                type: [String],
                default: []
            },
            sites: {
                type: [String],
                default: []
            },
            countries: {
                type: [String],
                default: []
            },
            adUnits: {
                type: [String],
                default: []
            }
        },
        order: {
            type: Number,
            default: 0
        },
        userId: {
            type: ObjectId,
            ref: "user",
            required: true,
            index: true
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
    }
);

// Compound index for user and reportId (unique per user)
reportPresetSchema.index({ userId: 1, reportId: 1 }, { unique: true });

reportPresetSchema.plugin(mongoosePaginate);

const ReportPreset = mongoose.model("reportPreset", reportPresetSchema);
export default ReportPreset;

