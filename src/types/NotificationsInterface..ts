import { Types } from "mongoose";

export interface NotificationsInterface {
  userId?: Types.ObjectId;
  title: string;
  templateId: string;
  readAt?: Date;
  createdAt?: Date;
  notificationType: string;
  MessageStatus: string;
  MessageSid: string;
  accountId: string;
  toPhoneNumber: string;
  status: string;
  notes: string;
}
