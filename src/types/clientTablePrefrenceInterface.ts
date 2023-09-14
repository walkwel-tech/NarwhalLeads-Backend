import { Document, Types } from "mongoose";

export interface ClientTablePreferenceInterface extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  columns: [];
}
