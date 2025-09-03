import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const messageSchema = new mongoose.Schema(
    {
        title: {
            type: String,
        },
        description: {
            type: String
        },
        image: {
            type: String
        },
        icon: {
            type: String
        },
        url: {
            type: String
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

messageSchema.plugin(mongoosePaginate);

const Message = mongoose.model("message", messageSchema);
export default Message;