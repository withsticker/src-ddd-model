
import express from "express";
import bcrypt from "bcrypt";
import userModel from '../../infrastructure/models/user.js';
import OTPModel from '../../infrastructure/models/otp.js'; 
// import { sendOTP } from "../../infrastructure/email/EmailSender.js";  
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();


router.post("/verifyOTP", async (req, res) => {
    try {
        const { otp, userId } = req.body;

        if (!userId || !otp) {
            throw new Error("Empty fields not allowed");
        }

        const verificationRecord = await OTPModel.find({ _id: userId });

        if (verificationRecord.length <= 0) {
            throw new Error("Otp does not exist");
        }

        const { expiresAt, otp: hashedOTP } = verificationRecord[0];

        if (expiresAt < Date.now()) {
            await OTPModel.deleteMany({ _id: userId });
            throw new Error("Code has expired");
        }

        const validateOTP = await bcrypt.compare(otp, hashedOTP);

        if (!validateOTP) {
            throw new Error("Invalid otp");
        }

        await userModel.updateOne(
            { _id: userId },
            { verified: true }
        );

        await OTPModel.deleteMany({ _id: userId });

        res.json({
            status: "SUCCESS",
            message: "User verified successfully",
        });

    } catch (e) {
        res.json({
            status: "ERROR",
            message: e.message
        });
    }
});


router.post("/resendOTP", async (req, res) => {
    try {
        const { userId, email } = req.body;

        if (!userId || !email) {
            throw new Error("Empty fields not allowed");
        }

        await OTPModel.deleteMany({ _id: userId });
        await sendOTP(userId, email);

        res.json({
            status: "SUCCESS",
            message: "OTP resent successfully",
        });
    } catch (e) {
        res.json({
            status: "ERROR",
            message: e.message
        });
    }
});

export default router;