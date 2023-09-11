import { Schema, Types } from "mongoose";

const UserServiceSchema = new Schema(
    {
      userId: {
        type: Types.ObjectId,
        default: null,
        ref: "Users",
      },
      financeOffers: {
        type: Boolean,
        default:false
      },
      prices: {
        type: String,
       default:"£"
      },
      accreditations:{
        type:Array,
      },
      avgInstallTime:{
        type: String,
        default: "1-2 weeks",
      },
      trustpilotReviews:{
        type:String,
      },
      criteria:{
        type:Array,
      }
    },
    { timestamps: true }
  );
  
  export { UserServiceSchema };