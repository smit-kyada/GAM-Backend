import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const siteRequestSchema = new mongoose.Schema(
    {
        userId: {
            type: ObjectId,
            ref: "user",
            required: true
        },
        siteId: {
            type: ObjectId,
            ref: "site",
            required: false // Made optional for new site requests
        },
        // Site details (auto-detected as existing or new)
        requestedSite: {
            type: String,
            trim: true,
            required: true
        },
        requestedDescription: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        requestMessage: {
            type: String,
            trim: true
        },
        adminResponse: {
            type: String,
            trim: true
        },
        reviewedBy: {
            type: ObjectId,
            ref: "user"
        },
        reviewedAt: {
            type: Date
        },
        // If approved, store the created site ID
        createdSiteId: {
            type: ObjectId,
            ref: "site"
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

siteRequestSchema.plugin(mongoosePaginate);

const SiteRequest = mongoose.model("siteRequest", siteRequestSchema);
export default SiteRequest;
