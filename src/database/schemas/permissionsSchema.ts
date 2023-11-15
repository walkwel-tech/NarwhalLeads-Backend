import { Schema } from "mongoose";

const PermissionSchema = new Schema(
  {
    role: {
      type: String
    },
    permissions: {
      type: Array,
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export { PermissionSchema };
