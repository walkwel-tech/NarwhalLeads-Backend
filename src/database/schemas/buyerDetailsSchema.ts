import { Schema } from "mongoose";

const BuyerQuestionSchema = new Schema({
  title: {
    type: String,
  },
  questionSlug: {
    type: String,
  },
  answer: {
    type: String
  }
});

const BuyerDetailsSchema = new Schema({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  businessIndustryId: {
    type: Schema.Types.ObjectId,
    ref: 'BuisnessIndustries', 
  },
  buyerQuestions: [BuyerQuestionSchema]
});

export { BuyerDetailsSchema };
