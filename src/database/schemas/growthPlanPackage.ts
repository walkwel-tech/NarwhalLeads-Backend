import { Schema } from "mongoose";

const planPackagsSchema = new Schema(
  {
    title: {
      type: String,
      default: null,
    },
    amountInPound: {
      type: String,
      default: null,
    },
    amountInEuro: {
      type: String,
      default: null,
    },
    description: {
      type: String,
    },
    features: {
      type: Array,
      default: [],
    },
    popular: {
      type: Boolean,
    },
    selected: {
      type: Boolean,
    },
    isActive: {
      type: Boolean,
    },
    createdAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export { planPackagsSchema };
