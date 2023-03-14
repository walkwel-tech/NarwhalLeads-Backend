import { Document, Types } from "mongoose";

export interface BusinessDetailsInterface extends Document {
  _id: Types.ObjectId;
  businessIndustry: string,
  businessName: string,
  businessLogo: string,
  businessSalesNumber: string,
  businessAddress: string,
  businessCity: string,
  businessCountry: string,
  businessPostCode: string, 
  businessOpeningHours: [],  
  isDeleted:  boolean,
  deletedAt:  Date,
}
