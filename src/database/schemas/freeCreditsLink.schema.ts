import { Schema, Types } from "mongoose";

const FreeCreditsLinkSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
    },
    isCommission: {
      type: Boolean,
      // required: true,
    },
    freeCredits: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: false,
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      typ: Date,
    },
    accountManager: {
      type: Types.ObjectId,
      ref: "User",
    },
    businessIndustryId: {
      type: Types.ObjectId,
      ref: "BuisnessIndustries",
    },
    giveCreditOnAddCard: {
      type: Boolean,
      default: false
    },
    firstCardBonusCredit: {
      type: Number,
      default: 0
    },
    isExpired : {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

export { FreeCreditsLinkSchema };
