import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const gameUserSchema = new mongoose.Schema(
    {
        userId: {
            type: String
        },
        userIp: {
            type: String
        },
        uUrl: {
            type: String
        },
        city: {
            type: String
        },
        region: {
            type: String
        },
        country: {
            type: String
        },
        country_code: {
            type: String
        },
        click: {
            type: Number
        },
        fcmValue: {
            endpoint: {
                type: String
            },
            expirationTime: {
                type: String
            },
            keys: {
                p256dh: {
                    type: String
                },
                auth: {
                    type: String
                }
            }
        },
        socketId: [{
            type: String,
        }],
        online: {
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

gameUserSchema.plugin(mongoosePaginate);

const GameUser = mongoose.model("gameUser", gameUserSchema);
export default GameUser;