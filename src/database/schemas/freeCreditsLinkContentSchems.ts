import { Schema, Types } from "mongoose";

const FreeCreditsLinkContentSchema = new Schema(
  {
    promolink: {
      type: Types.ObjectId,
      ref: "FreeCreditsLink",
      required: true,
    },
    heroSection: {
      type: String,
      required: false,
    },
    qualityLeads: {
      type: String,
      required: false,
    },
    leadShowCase: {
      type: String,
      required: false,
    },
    badgeTitle: {
      type: String,
      required: false,
    },
    badgeSubTitle: {
      type: String,
      required: false,
    },
    badgeColour: {
      type: String,
      required: false,
    },
    replacementPolicyHeader: {
      type: String,
      required: false,
    },
    replacementPolicyText: {
      type: String,
      required: false,
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

export { FreeCreditsLinkContentSchema };
