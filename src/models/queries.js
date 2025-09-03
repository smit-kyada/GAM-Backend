import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";


const ObjectId = mongoose.SchemaTypes.ObjectId


const queriesSchema = new mongoose.Schema(
    {
        userId: {
            type: ObjectId,
            ref: "user"
        },
        message: {
            type: String,
        },
        isRaised: {
            type: Boolean,
            default: false
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



queriesSchema.plugin(mongoosePaginate);

const Queries = mongoose.model("queries", queriesSchema);
export default Queries;