import { Schema, Types } from "mongoose";

const SupplierLinkSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: "Users"
    },
    link: String,
    firstSeen: {
        type: Date,
        default: null
    },
    lastSeen: {
        type: Date,
        default: null
    },
    lastChecked: {
        type: Date,
        default: null
    },
    transactionId: {
        type: Types.ObjectId,
        ref: "Transactions"
    },
    amount: Number
})

export {SupplierLinkSchema}