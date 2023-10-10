import { Schema, Types } from "mongoose";
import { LOGS_STATUS } from "../../utils/Enums/logs.status.enum";

const LogsSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      default: null,
      ref: "User",
    },
    registrationId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: LOGS_STATUS.INITIATE,
    },
    notes: {
      type: String,
      default: "",
    },
    portal: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export { LogsSchema };
