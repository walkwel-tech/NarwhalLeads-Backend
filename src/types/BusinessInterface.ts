import { Document, Types } from "mongoose";

export interface BusinessDetailsInterface extends Document {
  _id: Types.ObjectId;
  businessIndustry: string,
  businessUrl: string,
  businessDescription:string,
  businessName: string,
  businessLogo: string,
  address1: string,
  address2: string,
  businessSalesNumber: string,
  businessMobilePrefixCode: string,
  businessAddress: string,
  businessCity: string,
  businessCountry: string,
  businessPostCode: string,
  businessOpeningHours: [],
  buyerQuestions? : Array<{
    title: string;
    questionSlug: string;
    answer: string;
  }>;
  isDeleted:  boolean,
  deletedAt:  Date,
}


export function isBusinessObject (b: unknown): b is BusinessDetailsInterface {
  return typeof b !== 'string' && Object.keys(b as Object).includes('businessName');
}


export function isBusinessObjectAndIncludesBusinessHours (b: unknown): b is BusinessDetailsInterface {
  return typeof b !== 'string' && Object.keys(b as Object).includes('businessOpeningHours');
}
