import { Document, Types } from "mongoose";

export interface LeadTablePreferenceInterface extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  columns: [];
}
