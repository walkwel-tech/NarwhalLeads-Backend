import { Document, Types } from "mongoose";

export interface UserLeadsDetailsInterface extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
  leadSchedule: [];
  postCodeTargettingList: [];
  leadAlertsFrequency: string;
  zapierUrl: string;
  sendDataToZapier: boolean;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt: Date;
  dailyLeadCost: number;
  miles: string;
  postcode: string;
  type: string;
}

export function isUserLeadDetailsObject(
  b: unknown
): b is UserLeadsDetailsInterface {
  return (
    typeof b !== "string" &&
    Object.keys(b as Object).includes("leadAlertsFrequency")
  );
}
