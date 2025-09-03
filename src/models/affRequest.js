import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";


const affRequestSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        email: {
            type: String,
        },
        mobile: {
            type: Number,
        },
        message: {
            type: String,
        },     
        isDeleted: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);



affRequestSchema.plugin(mongoosePaginate);

const AffRequest = mongoose.model("affRequest", affRequestSchema);
export default AffRequest;