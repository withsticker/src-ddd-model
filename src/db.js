import mongoose, {model,Schema}  from 'mongoose';
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve("..", ".env") });

const MONGO_URL = process.env.MONGO_URI

mongoose.connect(MONGO_URL, {
    // poolSize: 10, // Adjust pool size as needed
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
})

const UserSchema=new Schema({
    name: {type:String},
    email:{type:String},
    password:String,
    verified:Boolean,
})

export const userModel=model("User",UserSchema);

const UserOTPVerification=new Schema({
    userId:String,
    otp:String,
    createdAt:Date,
    expiresAt:Date,
});

export const OTPModel=model("OTP",UserOTPVerification);
