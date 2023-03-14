import { Document, Types } from "mongoose";

export interface invoiceInterface extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    transactionId: Types.ObjectId;
    price:string
    invoiceId:string
}
