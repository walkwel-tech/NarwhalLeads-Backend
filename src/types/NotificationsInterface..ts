import { Types } from "mongoose";

export interface NotificationsInterface {
   userId?:Types.ObjectId,
   title:string,
   templateId:string,
   readAt?:Date,
   createdAt?:Date
  }