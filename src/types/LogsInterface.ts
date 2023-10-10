import { Document, Types } from "mongoose";

export interface LogsInterface extends Document {
  userId: Types.ObjectId;
  registrationId: string;
  status: string;
  notes: string;
  portal: string;
}
