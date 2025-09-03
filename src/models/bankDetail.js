import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
const ObjectId = mongoose.SchemaTypes.ObjectId;

const bankDetailSchema = new mongoose.Schema(
    {
        userId: {
            type: ObjectId,
            ref: "user"
        },
        bankName: {
            type: String,
        },
        accNumber: {
            type: String,
        },
        ifscCode: {
            type: String,
        },
        swiftCode: {
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



bankDetailSchema.plugin(mongoosePaginate);

const BankDetail = mongoose.model("bankDetail", bankDetailSchema);
export default BankDetail;