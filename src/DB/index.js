import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.set("strictQuery", false);
     return await mongoose.connect(process.env.DATABASE_URL, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        // useCreateIndex: true,   
    });
}

export { connectDB }
