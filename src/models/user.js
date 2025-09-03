import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";
import validator from "validator";
import bcrypt from "bcryptjs";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const userSchema = new mongoose.Schema(
    {
        userName: {
            type: String,
            trim: true,
        },
        companyName: {
            type: String,
            trim: true,
        },
        companyAddress: {
            type: String,
        },
        pincode: {
            type: Number
        },
        Designation: {
            type: String
        },
        AgreementStartDate: {
            type: Date
        },
        AgreementEndDate: {
            type: Date
        },
        fName: {
            type: String,
            trim: true,
        },
        lName: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            index: true,
            lowercase: true,
            trim: true,
            unique: true,
            validate: [validator.isEmail, "Invalid Email"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            trim: true,
            minlength: [8, "Password must be at least 8 characters"],
            maxlength: [128, "Password max length exceed"]
        },
        role: {
            type: String,
            enum: ['admin', 'client', 'subadmin'],
            required: true
        },
        contact: {
            type: Number,
            min: 100000000,
            max: 9999999999
        },
        code: {
            type: String,
            default: ""
        },
        profileImg: {
            type: String
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        isPolicyAccept: {
            type: Boolean,
            default: false
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        users: [{
            type: ObjectId,
            ref: "user"
        }],
        showTotalGameUser: {
            type: Boolean,
            default: false,
        },
        block: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: false
        },
        isOnlyReport: {
            type: Boolean,
            default: false
        },
        showReport: {
            type: Boolean,
            default: false
        },
        showAllData: {
            type: Boolean,
            default: false
        },
        adminToken: {
            type: String
        },
        registerOtp: {
            type: Number
        },
        registerOtpExpiry: {
            type: Number
        },
        registerVerified: {
            type: Boolean,
            default: false
        },
        emailOtp: {
            type: Number
        },
        phoneOtp: {
            type: Number
        },
        phoneOtpExpiry: {
            type: Number
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

userSchema.pre("save", async function () {
    const user = this;
    if (user.isModified("password")) {
        const saltRounds = 10;
        user.password = await bcrypt.hash(this.password, saltRounds);
    }
});

userSchema.methods.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.plugin(mongoosePaginate);

const User = mongoose.model("user", userSchema);
export default User;