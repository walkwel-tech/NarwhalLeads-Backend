import { Schema } from "mongoose";

const TermsAndConditionsSchema = new Schema({
    content: {
        type: String,
        required: true,
    },
}, {timestamps: true});

export {TermsAndConditionsSchema };
