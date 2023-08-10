import { Schema, Types } from "mongoose";

const LeadsSchema = new Schema(
  {
    bid: {
      type: String,
      required: true,
    },
    leadsCost: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    leads: {
      type: Object,
      required: true,
    },
    invalidLeadReason: {
      type: String,
      default: '',
    },
    feedbackForNMG: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: null,
    },
    rowIndex: {
      type: Number,
      default: 0,
    },
    reportedAt:{
      type:Date
    },
    reportAcceptedAt:{
      type:Date
    },
    reportRejectedAt:{
      type:Date
    },
    clientNotes: {
      type: String,
      default: "",
    },
    industryId: {
      type: Types.ObjectId,
      ref: "BuisnessIndustries",
    },

  },
  { timestamps: true }
);

export { LeadsSchema };
