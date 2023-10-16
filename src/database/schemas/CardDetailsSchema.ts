import { Schema, Types } from "mongoose";

const CardDetailsSchema = new Schema(
  {
    cardHolderName: {
      type: String,
      required: false,
    },
    cardNumber: {
      type: String,
      required: true,
    },
    expiryMonth: {
      type: String,
      required: false,
    },
    expiryYear: {
      type: String,
      required: false,
    },
    cvc: {
      type: String,
    },
    userId: {
      type: Types.ObjectId,
      default: null,
      ref: "User",
    },
    amount: {
      type: Number,
      required: false,
    },
    isDefault: {
      type: Boolean,
      required: false,
    },
    createdAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    paymentMethod: {
      type: String,
    },
    paymentSessionID: {
      type: String,
    },
    status: {
      type: String,
    },
    cardType: {
      type: String,
    },
  },
  { timestamps: true }
);

export { CardDetailsSchema };
