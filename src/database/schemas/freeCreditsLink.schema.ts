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
    user: [
      {
        userId: {
          type: Types.ObjectId,
          ref: "User",
        },
        userCount: Number,
        businessDetailsId: {
          type: Types.ObjectId,
          ref: "BusinessDetails", // Reference to the Business model
        },
      },
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
    }
  },
  { timestamps: true }
);

export { FreeCreditsLinkSchema };
