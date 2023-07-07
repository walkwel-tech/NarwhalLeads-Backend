import { Document, Types } from "mongoose";


export interface TransactionInterface extends Document {
  _id: Types.ObjectId;
  userId:string
  cardId: string;
  amount: number;
  status:string;
  title: string;
  isDebited: boolean;
  isCredited: boolean;
  invoiceId:string;
  createdAt: Date;
  paymentSessionId:string;
  // creditsLeft:number

}