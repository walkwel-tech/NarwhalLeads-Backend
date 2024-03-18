import { Schema } from "mongoose";

const BusinessDetailsSchema = new Schema(
  {
    businessIndustry: {
      type: String,
      required: false,
    },
    businessDescription:{
      type:String,
      required:false
    },
    businessName: {
      type: String,
      required: false,
    },
    businessUrl: {
      type: String,
      required: false,
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
    businessMobilePrefixCode : {
      type: String,
      required: true,

    },
    businessAddress: {
      type: String,
      required: false,
    },
    businessCity: {
      type: String,
      required: false,
    },
    businessCountry: {
      type: String,
      required: false,
    },
    businessPostCode: {
      type: String,
      required: false,
    },
    businessOpeningHours: {
      type: Array,
      required: false,
    },
    buyerQuestions: {
      type: [],
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
