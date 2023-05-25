import { Schema } from "mongoose";

const BusinessDetailsSchema = new Schema(
  {
    businessIndustry: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      required: true,
    },
    businessLogo: {
      type: String,
      required: false,
    },
    address1: {
      type: String,
      required: false,
    },
    address2: {
      type: String,
      required: false,
    },
    businessSalesNumber: {
      type: String,
    },
    businessAddress: {
      type: String,
      required: true,
    },
    businessCity: {
      type: String,
      required: true,
    },
    businessCountry: {
      type: String,
      required: false,
    },
    businessPostCode: {
      type: String,
      required: true,
    },
    businessOpeningHours: {
      type: Array,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export { BusinessDetailsSchema };
