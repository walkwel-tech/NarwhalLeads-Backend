import { Document, Types } from "mongoose";

interface ValidationConfigInterface extends Document {
  _id: Types.ObjectId;
  key: string;
  value: string | number;
  type: "min" | "max";
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export { ValidationConfigInterface };
