import { Schema } from "mongoose";
import { json } from "../../utils/constantFiles/businessIndustryJson";

const BuisnessIndustriesSchema = new Schema(
  {
    industry: {
      type: String,
    },
    avgConversionRate: {
      type: Number,
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    associatedCurrency: {
      type: String,
    },
    country: {
      type: String,
    },
  },
  { timestamps: true }
);
export { BuisnessIndustriesSchema };
