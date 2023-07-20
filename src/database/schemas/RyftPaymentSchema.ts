import { Schema, Types } from "mongoose";

const RyftPaymentSchema = new Schema(
    {
      userId: {
        type: Types.ObjectId,
        default: null,
        ref: "Users",
      },
      ryftClientId: {
        type: String,
        default: null,
      },
      cardId:{
        type: Types.ObjectId,
        default: null,
        ref: "CardDetails",
      },
      paymentMethod:{
        type:String
      },
      paymentSessionID:{
        type:String
      },
      status:{
        type:String
      }
    
    },
    { timestamps: true }
  );
  
  export { RyftPaymentSchema };