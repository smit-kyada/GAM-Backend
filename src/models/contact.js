import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";


const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        email: {
            type: String,
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



contactSchema.plugin(mongoosePaginate);

const Contact = mongoose.model("contact", contactSchema);
export default Contact;