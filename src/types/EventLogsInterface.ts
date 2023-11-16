import { Document, Types } from "mongoose";

export interface EventLogsInterface extends Document {
  userId: Types.ObjectId;
  eventType: string;
  eventTitle: string;
  notes: string;
  statusCode: string;
  data: object;
}
