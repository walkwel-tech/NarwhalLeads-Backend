import { Schema } from "mongoose";

const BuyerQuestionSchema = new Schema(
  {
    title: {
      type: String,
    },
    questionSlug: {
      type: String,
    },
    answer: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const BuyerDetailsSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    businessIndustryId: {
      type: Schema.Types.ObjectId,
      ref: "BuisnessIndustries",
    },
    buyerQuestions: [BuyerQuestionSchema],
  },
  { timestamps: true }
);

export { BuyerDetailsSchema };
