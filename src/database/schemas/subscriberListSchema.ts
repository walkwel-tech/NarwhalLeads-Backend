import { Schema } from "mongoose";

const SubscriberListSchema = new Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    isDeleted:{
        type: Boolean,
        default:false

    }

}, {timestamps: true});

export {SubscriberListSchema };