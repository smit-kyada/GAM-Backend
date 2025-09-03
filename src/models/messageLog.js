import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const MessageLogSchema = new mongoose.Schema(
    {
        messageId: {
            type: ObjectId,
            ref: "message"
        },
        click: {
            type: Number,
            default: 0
        },
        site: {
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

MessageLogSchema.plugin(mongoosePaginate);

const MessageLog = mongoose.model("messageLog", MessageLogSchema);
export default MessageLog;