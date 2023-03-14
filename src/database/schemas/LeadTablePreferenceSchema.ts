import { Schema, Types } from "mongoose";

const LeadTablePreferenceSchema = new Schema(
    {
      userId: {
        type: Types.ObjectId,
        default: null,
        ref: "Users",
      },
      columns:{
        type:Array
      }
    },
    { timestamps: true }
  );
  
  export { LeadTablePreferenceSchema };