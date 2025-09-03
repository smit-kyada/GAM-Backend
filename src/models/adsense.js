import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const AdsenseSchema = new mongoose.Schema(
    {
        access_token: {
            type: String,
            trim: true,
        },
        refresh_token: {
            type: String,
            trim: true,
        },
        scope: {
            type: String,
        },
        id_token: {
            type: String,
        },
        token_type: {
            type: String,
        },
        expiry_date: {
            type: Number,
        },
        authUrl: {
            type: String,
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



AdsenseSchema.plugin(mongoosePaginate);

const Adsense = mongoose.model("adsense", AdsenseSchema);
export default Adsense;