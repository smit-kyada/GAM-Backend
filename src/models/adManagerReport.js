import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const AdManagerReportSchema = new mongoose.Schema(
    {
        reportId: {
            type: String,
            required: true,
            unique: true,
        },
        profileId: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['STANDARD', 'CUSTOM'],
            default: 'STANDARD',
        },
        format: {
            type: String,
            enum: ['JSON', 'CSV', 'XML'],
            default: 'JSON',
        },
        status: {
            type: String,
            enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
            default: 'PENDING',
        },
        dateRange: {
            type: String,
            required: true,
        },
        dimensions: [{
            type: String,
        }],
        metrics: [{
            type: String,
        }],
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

AdManagerReportSchema.plugin(mongoosePaginate);

const AdManagerReport = mongoose.model("adManagerReport", AdManagerReportSchema);
export default AdManagerReport;
