import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";


const deductionSchema = new mongoose.Schema(
    {
        site_link: {
            type: String,
        },
        deduction: {
            type: Number,
        },
        date: {
            type: Date
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



deductionSchema.plugin(mongoosePaginate);

const Deduction = mongoose.model("deduction", deductionSchema);
export default Deduction;