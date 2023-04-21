import { Schema, Types } from "mongoose";

const customColumnNamesSchema = new Schema({
    industryId: {
        type: Types.ObjectId,
        ref: "BuisnessIndustries",
      },
    columnsNames:{
        type: Array,
    },
    
}, {timestamps: true});
export {customColumnNamesSchema};