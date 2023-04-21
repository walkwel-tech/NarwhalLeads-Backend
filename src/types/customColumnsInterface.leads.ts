import { Document, Types } from "mongoose";

export interface customColumnsInterface extends Document {
  industryId: Types.ObjectId;
  columnsNames: [];
}
