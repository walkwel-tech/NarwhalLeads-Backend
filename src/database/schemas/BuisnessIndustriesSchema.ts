import { Schema } from "mongoose";
import { json } from "../../utils/constantFiles/businessIndustryJson";

const BuisnessIndustriesSchema = new Schema(
  {
    industry: {
      type: String,
    },
    leadCost: {
      type: Number,
    },
    columns: {
      type: Array,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    json: {
      type: Object,
      default: json,
    },
  },
  { timestamps: true }
);
export { BuisnessIndustriesSchema };
