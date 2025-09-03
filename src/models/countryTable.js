import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

const ObjectId = mongoose.SchemaTypes.ObjectId;

const CountryTableSchema = new mongoose.Schema(
    {
        site: {
            type: String
        },
        date: {
            type: Date,
        },
        estimatedEarning: {
            type: Number,
        },
        pageViews: {
            type: Number,
        },
        pageRpm: {
            type: Number,
        },
        impressions: {
            type: Number,
        },
        impressionsRpm: {
            type: Number,
        },
        activeViewViewable: {
            type: Number,
        },
        clicks: {
            type: Number,
        },
        country: {
            type: String
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

CountryTableSchema.plugin(mongoosePaginate);

const CountryTable = mongoose.model("countryTable", CountryTableSchema);
export default CountryTable;