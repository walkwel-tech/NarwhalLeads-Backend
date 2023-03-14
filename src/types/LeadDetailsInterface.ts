import { Document, Types } from "mongoose";

export interface UserLeadsDetailsInterface extends Document {
  _id: Types.ObjectId;
  userId:Types.ObjectId;
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
  leadSchedule: [];
  postCodeTargettingList:string;
  leadAlertsFrequency:string;
  createdAt: Date;
  isDeleted:  boolean,
  deletedAt:  Date,
}