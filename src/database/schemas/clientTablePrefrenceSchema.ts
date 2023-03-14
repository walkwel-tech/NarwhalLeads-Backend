import { Schema } from "mongoose";

const ClientTablePreferenceSchema = new Schema(
    {
      columns:{
        type:Array
      }
    },
    { timestamps: true }
  );
  
  export { ClientTablePreferenceSchema };