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
    associatedCurrency: {
      type: String
    },
    country: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    json: {
      type: Object,
      default: json,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);
export { BuisnessIndustriesSchema };
