import { Document } from "mongoose";

export interface subscriberListInterface extends Document {
    firstName: string;
    lastName: string;
    email:string;
    isDeleted:boolean;
}