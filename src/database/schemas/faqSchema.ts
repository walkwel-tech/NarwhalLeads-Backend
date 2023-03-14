import { Schema } from "mongoose";

const FaqSchema = new Schema({
    content: {
        type: String,
        required: true,
    },
}, {timestamps: true});

export {FaqSchema };
