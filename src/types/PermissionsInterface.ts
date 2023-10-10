import { Document } from "mongoose";

export interface PermissionInterface extends Document {
  role: string;
  permissions: Array<{
    module: string;
    permission: string[];
  }>;
}
