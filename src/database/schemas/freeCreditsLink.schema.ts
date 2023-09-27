import { Schema, Types } from "mongoose";

const FreeCreditsLinkSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
    },
    freeCredits: {
      type: Number,
      required: true,
    },
    useCounts: {
      type: Number,
    },
    maxUseCounts: {
      type: Number,
      required: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: Types.ObjectId,
        ref: "User",
      }
    ],
    usedAt: {
      type: Date,
      default: null,
    },
    topUpAmount: {
      type: Number,
      default: 0,
    },
    spotDiffPremiumPlan: {
      type: Boolean,
    },
    name: {
      type: String,
      required: true,
    },
    isDeleted:{
      type:Boolean,
      default:false
    },
    deletedAt:{
      typ:Date
    },
    accountManager:{
      type: Types.ObjectId,
      ref: "User",
    }
  },
  { timestamps: true }
);

export { FreeCreditsLinkSchema };
