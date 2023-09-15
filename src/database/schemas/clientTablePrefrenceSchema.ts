import { Schema, Types } from "mongoose";

const ClientTablePreferenceSchema = new Schema(
  {
    columns: {
      type: Array,
    },
    userId: {
      type: Types.ObjectId,
      default: null,
      ref: "User",
    },
  },
  { timestamps: true }
);

export { ClientTablePreferenceSchema };
