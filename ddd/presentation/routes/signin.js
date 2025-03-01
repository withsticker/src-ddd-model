import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from '../../infrastructure/models/user.js';  
import OTPModel from '../../infrastructure/models/otp.js'; 
import { transporter } from '../../infrastructure/email/EmailSender.js'
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET; // Use from .env


    const sendOTP = async (user_id, email) => {
        try {
        const user = await userModel.findOne({ email });
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

        const mailStruct = {
            from: process.env.EMAIL,
            to: email,
            subject: "Verify Your Email",
            html: `<p>Your OTP is <b>${otp}</b> to verify the email by - Mayank Kamriya</p>
        <p>OTP is valid for 1 Hour.</p>`,
        }

        const hashedOTP = await bcrypt.hash(otp, 4);

        if (!user) {
            const newOTP = await OTPModel.create({
                _id: user_id,
                otp: hashedOTP,
                createdAt: Date.now(),
                expiresAt: Date.now() + 3600000,
            })

        }
        else {
            await OTPModel.updateOne({ _id: user_id },
                {
                    otp: hashedOTP,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 5 * 60 * 1000,
                },
                { upsert: true }
            );


        }
        await transporter.sendMail(mailStruct);

    }
    catch (e) {
        console.log(e);
    }
}

// Login with Password Route
router.post("/password", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(403).json({ message: "User not found" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(403).json({ message: "Invalid password" });
        }
        
        const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET);

        res.json({
            token,
            message: "Login successful",
        });

    } catch (e) {
        res.status(500).json({
            message: "Internal server error",
            error: e.message
        });
    }
});

// Request OTP Route
router.post("/request-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        let user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        await sendOTP(user._id, email);

        res.json({ message: "OTP sent successfully" });

    } catch (e) {
        console.error("Error in /signin/request-otp:", e);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
