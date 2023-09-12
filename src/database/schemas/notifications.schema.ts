import { Schema, Types } from "mongoose";
import { NOTIFICATION_TYPE } from "../../utils/Enums/notificationType.enum";

const NotificationsSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      default: null,
      ref: "Users",
    },
    title: {
      type: String,
      default: null,
    },
    templateId: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
    },
    notificationType: {
      type: String,
      default: NOTIFICATION_TYPE.EMAIL,
    },
    callerIds:{
      type: String,
      default: null,
    },
    createdAt: { type: Date },
  },
  { timestamps: true }
);

export { NotificationsSchema };
