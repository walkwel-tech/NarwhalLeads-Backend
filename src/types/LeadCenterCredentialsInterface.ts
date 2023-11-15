import { Document, Types } from "mongoose";

export interface LeadCenterCredentialInterface extends Document {
    token: string;
  _id: Types.ObjectId;
}