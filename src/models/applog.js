import mongoose from "mongoose";
import mongoosePaginate from 'mongoose-paginate'
const ObjectId = mongoose.SchemaTypes.ObjectId;

const ApplogSchema = mongoose.Schema({
    userId: {
        type: ObjectId,
        ref: "user"
    },
    title: {
        type: String
    },
    logFor: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
);

ApplogSchema.plugin(mongoosePaginate);
const Applog = mongoose.model('applog', ApplogSchema)

export default Applog;