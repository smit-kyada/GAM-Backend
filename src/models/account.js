import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
const ObjectId = mongoose.SchemaTypes.ObjectId;


const accountSchema = new mongoose.Schema(
    {
        userId: {
            type: ObjectId,
            ref: "user"
        },
        bankName: {
            type: String,
        },
        IFSC: {
            type: String,
        },
        accountHolderName: {
            type: String,
        },
        accountNumber: {
            type: String,
        },
        accountType: {
            type: String,
            enum: ["saving", "current"]
        },
        GstNumber: {
            type: String,
        },
        GstCertificate: {
            type: String,
        },
        active: {
            type: Boolean,
            default: false,
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



accountSchema.plugin(mongoosePaginate);

const Account = mongoose.model("account", accountSchema);
export default Account;