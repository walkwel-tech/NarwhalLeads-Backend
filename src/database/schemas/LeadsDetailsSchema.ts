import { Schema, Types } from "mongoose";

const UserLeadsDetailsSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
    },
    total: {
      type: Number,
      default: 0,
    },
    daily: {
      type: Number,
      default: 0,
    },
    weekly: {
      type: Number,
      default: 0,
    },
    monthly: {
      type: Number,
      default: 0,
    },
    leadSchedule: {
      type: Array,
      default: "",
    },
    leadAlertsFrequency: {
      type: String,
      default: "",
    },
    zapierUrl: {
      type: String,
      default: "",
    },
    sendDataToZapier: { 
      type: Boolean ,
      default:true,
    },
    postCodeTargettingList: {
      type: Array,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    }
  },

  { timestamps: true }
);

export { UserLeadsDetailsSchema };
