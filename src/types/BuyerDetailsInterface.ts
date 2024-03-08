import { Document } from "mongoose";

interface BuyerQuestion {
  title: string;
  questionSlug: string;
  answer?: string | null;
}

interface BuyerDetailsInterface extends Document {
  clientId: string; 
  businessIndustryId: string;
  buyerQuestions: BuyerQuestion[];
}

export { BuyerDetailsInterface, BuyerQuestion };
