import { Document, Types } from "mongoose";

export interface InvoiceInterface extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  transactionId: Types.ObjectId;
  price: number;
  invoiceId: string;
}
