import { Document, Types } from "mongoose";

export interface AutoUpdatedTasksLogsInterface extends Document {
  userId: Types.ObjectId;
  title: string;
  notes: string;
  statusCode: string;
}
