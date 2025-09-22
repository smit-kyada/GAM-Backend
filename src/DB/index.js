// db.js
import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
    if (isConnected) return mongoose.connection;

    mongoose.set("strictQuery", false);

    try {

        await mongoose.connect(process.env.DATABASE_URL,
            {
                maxPoolSize: 50,        // tune based on your traffic
                minPoolSize: 5,
                maxIdleTimeMS: 30000,   // close idle sockets
                serverSelectionTimeoutMS: 5000
            }
        );

        isConnected = true;
        console.log("✅ Database connected successfully!");
        return mongoose.connection;
    } catch (err) {
        console.error("❌ Database connection failed:", err);
        throw err;
    }
};
