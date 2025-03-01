import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { OTPModel, userModel } from "./db.js";
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
import { userMiddleware } from "./middleware.js";
import cors from "cors";
import nodemailer from "nodemailer";  
import path from "path";

dotenv.config({ path: path.resolve("..", ".env") });
const app = express();

const JWT_SECRET=process.env.JWT_SECRET
const corsOptions = {
    origin: '*', // Allow all origins temporarily
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // Must be false when using origin: '*'
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// app.use(cors({
    //     origin: ['https://unihox-2f4d.vercel.app/'],
    //     methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    //     allowedHeaders: ['Content-Type', 'Authorization'],
    //     credentials: true
    // }));
    
    app.use(express.json());
    
    app.get('/', (req, res) => {
        res.send('Front Page!');
    });
    
    
    const transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 465,
        secure: true, 
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASS,
        },
    });



        
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

app.get('/test', (req, res) => {
    res.send('CORS test successful!');
});

app.post("/api/v1/signin/password", async (req, res) => {
    // res.send('Test');
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

app.post("/api/v1/signin/request-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Find or create the user
        let user = await userModel.findOne({ email });

        if (!user) {
            // user = new userModel({ email, verified: false });
            return res.status(400).json({ message: "User not Found" });
            // await user.save();
        }

        // Call the sendOTP function to generate, hash, and send OTP via email
        await sendOTP(user._id, email);

        res.json({ message: "OTP sent successfully" });

    } catch (e) {
        console.error("Error in /signin/request-otp:", e);
        res.status(500).json({ message: "Internal server error" });
    }
});



app.post("/api/v1/signin/otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch OTP using user ID
        const verificationRecord = await OTPModel.findOne({ _id: user._id });

        if (!verificationRecord) {
            return res.status(401).json({ message: "Invalid OTP" });
        }

        const { expiresAt, otp: hashedOTP } = verificationRecord;

        if (expiresAt < Date.now()) {
            await OTPModel.deleteMany({ _id: user._id });
            return res.status(401).json({ message: "OTP has expired" });
        }

        const validateOTP = await bcrypt.compare(otp, hashedOTP);

        if (!validateOTP) {
            return res.status(401).json({ message: "Invalid OTP" });
        }

        // Mark user as verified if not already
        if (!user.verified) {
            await userModel.updateOne({ _id: user._id }, { verified: true });
        }

        await OTPModel.deleteMany({ _id: user._id }); // Remove OTP after use

        // Generate JWT token
        const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "1h" });
        res.json({
            token,
            message: "Login successful",
        });

    } catch (e) {
        console.error("Error in /signin/otp:", e);
        res.status(500).json({ message: "Internal server error" });
    }
});




app.post("/api/v1/signup", async (req, res) => {
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

app.post("/api/v1/verifyOTP", async (req, res) => {
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


app.post("/resendOTP", async (req, res) => {
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

app.get("/api/v1/dashboard", userMiddleware, (req, res) => {
    res.status(200).json({
        message: "Welcome to the dashboard! You are authenticated."
    });
});


// app.options('*', (req, res) => {
//     console.log('Preflight request received');
//     res.sendStatus(200);
// });


// const port = process.env.PORT || 3000;
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
// app.listen(port, () => {
//     console.log(`Server running on port ${port}`);
// });