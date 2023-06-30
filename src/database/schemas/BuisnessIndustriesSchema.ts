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
    columnsNames:{
        type: Array,
    },
    isActive:{
        type:Boolean,
        default:true
    }
    
}, {timestamps: true});
export {BuisnessIndustriesSchema};