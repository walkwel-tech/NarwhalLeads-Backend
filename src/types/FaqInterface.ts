import { Document, Types } from "mongoose";

export interface FaqInterface extends Document {
  _id: Types.ObjectId;
 content:string

}
