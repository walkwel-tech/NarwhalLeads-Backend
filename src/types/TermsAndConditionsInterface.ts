import { Document, Types } from "mongoose";

export interface TermsAndConditionsInterface extends Document {
  _id: Types.ObjectId;
  content: string;
}
