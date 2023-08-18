import { Schema, Types } from "mongoose";

const FreeCreditsLinkSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

export { FreeCreditsLinkSchema };
