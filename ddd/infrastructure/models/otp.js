import mongoose from "mongoose";

const { Schema, model } = mongoose;

const UserOTPVerificationSchema = new Schema({
    userId: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
});

export default model("OTP", UserOTPVerificationSchema);
