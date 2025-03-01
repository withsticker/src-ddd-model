import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("..", ".env") });

const JWT_SECRET = process.env.JWT_SECRET;

export const userMiddleware = (req, res, next) => {
    const header = req.headers.authorization;


    if (!header) {
        return res.status(403).json({
            message: "Authorization header is missing"
        });
    }

    try {
        const decoded = jwt.verify(header, JWT_SECRET);
        if (decoded) {
            req.userId = decoded.id;
            console.log("Middleware ran");
            next();
        }
        else {
            throw new Error("Wrong token")
        }

    } catch (error) {
        console.error("Token verification failed:", error);
        return res.status(403).json({
            message: "You are not logged in",
            error: error.message
        });
    }
};