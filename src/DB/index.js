import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.set("strictQuery", false);
    console.log("Connecting to database...");
    try {
        const connection = await mongoose.connect(process.env.DATABASE_URL, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // useCreateIndex: true,   
        });
        console.log("✅ Database connected successfully!");
        return connection;
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        throw error;
    }
}

export { connectDB }
