import { Document, Types } from "mongoose";

export interface forgetPassInterface extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    email: string;
    password:string
}
