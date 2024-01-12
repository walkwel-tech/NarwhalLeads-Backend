import { Schema, Types } from "mongoose";

const EventLogsSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      default: null,
      ref: "User",
    },
    eventType: {
      type: String,
      default: "",
    },
    eventTitle: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    statusCode: {
      type: String,
      default: "",
    },
    data: {
      type: Object,
    },
  },
  { timestamps: true }
);

export { EventLogsSchema };
