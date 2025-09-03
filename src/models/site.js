import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import bcrypt from "bcryptjs";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const siteSchema = new mongoose.Schema(
    {
        userId: {
            type: ObjectId,
            ref: "user"
        },
        site: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            trim: true,
            minlength: [8, "Password must be at least 8 characters"],
            maxlength: [128, "Password max length exceed"]
        },
        description: {
            type: String
        },
        isActive: {
            type: Boolean,
            default: false
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
    }
);

siteSchema.methods.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

siteSchema.pre("save", async function () {
    const user = this;
    if (user.isModified("password")) {
        const saltRounds = 10;
        user.password = await bcrypt.hash(this.password, saltRounds);
    }
});

siteSchema.plugin(mongoosePaginate);

const Site = mongoose.model("site", siteSchema);
export default Site;