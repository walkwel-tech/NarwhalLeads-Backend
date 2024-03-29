import { Document, Types } from "mongoose";

export interface AdminSettingsInterface extends Document {
  _id: Types.ObjectId;
  amount: number;
  thresholdValue: string;
  defaultLeadAmount: string;
  minimumUserTopUpAmount:string;
  createdAt: Date;
}
