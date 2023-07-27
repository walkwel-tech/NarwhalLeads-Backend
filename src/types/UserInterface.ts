import { Document, Types } from "mongoose";

import { RolesEnum } from "./RolesEnum";

export interface UserInterface extends Document {
  _id: Types.ObjectId;
  businessIndustryId:Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: RolesEnum;
  autoCharge: boolean;
  paymentMethod: string;
  phoneNumber:string;
  credits: number;
  autoChargeAmount:number;
  leadCost: string;
  isLeadCostCheck:boolean;
  buyerId: string;
  xeroContactId: string;
  isVerified: boolean;
  verifiedAt: Date;
  isActive: boolean;
  activatedAt: Date;
  isDeleted: boolean;
  rowIndex: number;
  isArchived:boolean;
  isUserSignup:boolean;
  invitedById: Types.ObjectId;
  userNotes:string;
  businessDetailsId: Types.ObjectId;
  userLeadsDetailsId: Types.ObjectId;
  onBoarding:[];
  registrationMailSentToAdmin:boolean;
  ryftClientId:string
  isRyftCustomer:boolean;
  isLeadbyteCustomer:boolean;
  premiumUser:string
  promoLinkId:Types.ObjectId;
  isLeadReceived:boolean;
  promoCodeUsed:boolean
}
