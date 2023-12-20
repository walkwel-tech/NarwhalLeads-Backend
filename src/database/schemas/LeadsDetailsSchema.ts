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
    dailyLeadCost: {
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
      default: "instant",
    },
    zapierUrl: {
      type: String,
      default: "",
    },
    sendDataToZapier: {
      type: Boolean,
      default: false,
    },
    postCodeTargettingList: {
      type: Array,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    miles: {
      type: String,
      default: "",
    },
    postcode: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "",
    },
  },

  { timestamps: true }
);

export { UserLeadsDetailsSchema };
