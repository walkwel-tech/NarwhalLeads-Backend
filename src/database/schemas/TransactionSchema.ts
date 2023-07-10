import { Schema, Types } from "mongoose";

const TransactionSchema = new Schema(
    {
      userId: {
        type: Types.ObjectId,
        default: null,
        ref: "Users",
      },
      cardId: {
        type: Types.ObjectId,
        default: null,
        ref: "CardDetails",
      },
      amount: {
        type: Number,
        required: true,
      },
      title:{
        type:String,
        //Enum:['','']
        required:true
      },
      invoiceId:{
        type: String,
        default: null,
      },
      status:{
        type:String,
        //Enum:['','']
        required:true
      },
      isDebited: {
        type: Boolean,
        default:false,
        required: false,
      },
      isCredited: {
        type: Boolean,
        default:false,
        required: false,
      },
      createdAt: {
        type: Date,
        default: null,
      },
      creditsLeft:{
        type:Number,
      }
    },
    { timestamps: true }
  );
  
  export { TransactionSchema };