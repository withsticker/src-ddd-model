
import express from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import userModel from '../../infrastructure/models/user.js';  
import {sendOTP} from "../../domain/services/AuthService.js";  
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.post("/", async (req, res) => {
   
    const requiredBody = z.object({
        name: z.string().min(3),
        password: z.string().min(5).max(15),
        email: z.string().email(),
    });

    const parsedData = requiredBody.safeParse(req.body);
// console.log('parsedData....' ,parsedData)
    if (!parsedData.success) {
        return res.status(400).json({
            status: "FAILED",
            message: "Invalid input data.",
        });
    }

    try {
        const { name, email, password } = req.body;

        const check_email = await userModel.findOne({ email });

        if (check_email) {
            return res.status(403).json({ message: "Email Already exist." });
        }

        // Ensure password is not undefined
        if (!password) {
            return res.status(400).json({
                status: "FAILED",
                message: "Password is required.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 4);

        const user = await userModel.create({
            name,
            email,
            password: hashedPassword,
            verified: false,
        });

        await sendOTP(user._id, user.email);

        res.json({
            status: "success",
            message: "User Created But Please Verify Email",
            user: user
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            status: "FAILED",
            message: "Error occurred while creating user.",
        });
    }
});

export default router;