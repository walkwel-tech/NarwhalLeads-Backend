import { Schema } from "mongoose";

const AdminSettingsSchema = new Schema({
    amount: {
        type: Number,
        default: 500,
        required: true,
    },
    minimumUserTopUpAmount: {
        type: Number,
        required: false,
    },
    thresholdValue: {
        type: String,
        required: true,
    },
    defaultLeadAmount: {
        type: Number,
        required: false,
    },
    createdAt: {
        type: Date,
        default: null
    },

}, {timestamps: true});

export {AdminSettingsSchema};
