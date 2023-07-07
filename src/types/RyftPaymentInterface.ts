import { Document, Types } from "mongoose";

export interface RyftPaymentInterface extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ryftClientId: string;
  cardId: Types.ObjectId;
  paymentMethod: string
}
