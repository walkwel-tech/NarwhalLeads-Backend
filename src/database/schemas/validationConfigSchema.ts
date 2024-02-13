import { Schema } from "mongoose";

const ValidationConfigSchema = new Schema(
  {
    key: {
      type: String,
      unique: true, 
    },
    value: {
      type: Schema.Types.Mixed,
      required: true 
    },
    type: {
      type: String,
      enum: ["min", "max"],
    },
    enabled: {
      type: Boolean,
      required: true 
    },
  },
  { timestamps: true }
);

export { ValidationConfigSchema };
