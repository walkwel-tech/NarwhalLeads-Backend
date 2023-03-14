import { Document, Types } from "mongoose";

export interface AccessTokenInterface extends Document {
  _id: Types.ObjectId;
  access_token:string
  refresh_token:string
}
