import { Types } from "mongoose";

export class CreateCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  userId: Types.ObjectId;
  street1: string;
  street2:string;
  towncity: string;
  // county:Name of county
  postcode: string;
  country_name: string;
  phone: string;
  businessId:Types.ObjectId
}
