import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("..", ".env") });
const MONGO_URL = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB in infrastructure");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1); // Exit the process if MongoDB connection fails
    }
};

export default connectDB;
