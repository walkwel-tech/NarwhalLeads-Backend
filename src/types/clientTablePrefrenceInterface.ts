import { Document, Types } from "mongoose";

export interface ClientTablePreferenceInterface extends Document {
  _id: Types.ObjectId;
  columns: [];
}
