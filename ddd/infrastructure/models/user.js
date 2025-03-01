import mongoose from "mongoose";

const { Schema, model } = mongoose;

const UserSchema = new Schema({
    name: { type: String },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
});

export default model("User", UserSchema);
