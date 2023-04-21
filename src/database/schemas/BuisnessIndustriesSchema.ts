import { Schema } from "mongoose";

const BuisnessIndustriesSchema = new Schema({
    industry: {
        type: String,
    },
    leadCost: {
        type: Number,
    },
    columns:{
        type: Array,
    },
    
}, {timestamps: true});
export {BuisnessIndustriesSchema};