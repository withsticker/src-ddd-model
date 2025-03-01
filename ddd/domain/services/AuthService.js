import bcrypt from "bcrypt";
import OTPModel from "../../infrastructure/models/otp.js";
import { transporter } from "../../infrastructure/email/EmailSender.js";
import userModel from "../../infrastructure/models/user.js"; // Ensure correct import

export const sendOTP = async (user_id, email) => {
    try {
        const user = await userModel.findOne({ email });
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

        const hashedOTP = await bcrypt.hash(otp, 4);

        const mailStruct = {
            from: process.env.EMAIL,
            to: email,
            subject: "Verify Your Email",
            html: `<p>Your OTP is <b>${otp}</b> to verify the email by - Mayank Kamriya</p>
                   <p>OTP is valid for 1 Hour.</p>`,
        };

        if (!user) {
            await OTPModel.create({
                _id: user_id,
                otp: hashedOTP,
                createdAt: Date.now(),
                expiresAt: Date.now() + 3600000, // 1 Hour
            });
        } else {
            await OTPModel.updateOne(
                { _id: user_id },
                {
                    otp: hashedOTP,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
                },
                { upsert: true }
            );
        }

        // Send OTP via email
        // await sendEmail(email, mailStruct.subject, "", mailStruct.html);
        await transporter.sendMail(mailStruct);

        console.log(`OTP sent successfully to ${email}`);
    } catch (e) {
        console.error("Error in sendOTP function:", e);
        throw new Error("Failed to send OTP");
    }
};
