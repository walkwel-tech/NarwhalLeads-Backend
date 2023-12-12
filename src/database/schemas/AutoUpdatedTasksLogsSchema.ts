import { Schema, Types } from "mongoose";

const AutoUpdatedTasksLogsSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      default: null,
      ref: "User",
    },
    title: {
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
  },
  { timestamps: true }
);

export { AutoUpdatedTasksLogsSchema };
