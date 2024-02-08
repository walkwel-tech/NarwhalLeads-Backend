import { Schema } from "mongoose";

const FreeCreditsConfigSchema = new Schema({
    tag: String,
    enabled: Boolean,
    amount: Number
})

export { FreeCreditsConfigSchema }