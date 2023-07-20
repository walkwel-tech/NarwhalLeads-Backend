import { Document, Types } from "mongoose";

export interface CardDetailsInterface extends Document {
  _id: Types.ObjectId;
  cardHolderName:string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  userId: Types.ObjectId;
  amount:Number;
  isDefault:boolean;
  createdAt: Date;
  isDeleted: boolean;
  paymentMethod: string;
  paymentSessionID: string;
  status: string;

}
