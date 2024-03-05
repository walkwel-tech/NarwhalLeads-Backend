import { Types } from "mongoose";

export interface AuthenticationKey{
    _id: Types.ObjectId,
    userId: Types.ObjectId,
    notes: string,
    key: string

}