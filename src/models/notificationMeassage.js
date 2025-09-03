import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const NotificationMessageSchema = new mongoose.Schema(
    {

        title: {
            type: String
        },
        color: {
            type: String
        },
        isActive: {
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

NotificationMessageSchema.plugin(mongoosePaginate);

const NotificationMessage = mongoose.model("notificationMessageSchema", NotificationMessageSchema);
export default NotificationMessage;