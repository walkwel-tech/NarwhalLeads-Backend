import { Schema, Types } from "mongoose";

const forgetPasswordSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        default: null,
        ref: "User",
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        default: false
    },
    createdAt: {
        type: Date,
        default: null
    },

}, {timestamps: true});

export {forgetPasswordSchema};
