import { Schema, Types } from "mongoose";

const invoiceSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        default: null,
        ref: "User",
    },
    transactionId: {
        type: Types.ObjectId,
        default: null,
        ref: "Transaction",
    },
    invoiceId: {
        type: String,
        default: null
    },
    price: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: null
    },

}, {timestamps: true});

export {invoiceSchema};