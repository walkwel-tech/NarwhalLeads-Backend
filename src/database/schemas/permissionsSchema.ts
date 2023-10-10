import { Schema } from "mongoose";

const PermissionSchema = new Schema(
  {
    role: {
      type: String,
    },
    permissions: {
      type: Array,
    },
  },
  { timestamps: true }
);

export { PermissionSchema };
