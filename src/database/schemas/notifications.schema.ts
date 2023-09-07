import { Schema, Types } from "mongoose";

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
    createdAt: { type: Date },
  },
  { timestamps: true }
);

export { NotificationsSchema };
