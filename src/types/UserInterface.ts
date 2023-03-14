import { Document, Types } from "mongoose";

import { RolesEnum } from "./RolesEnum";

export interface UserInterface extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: RolesEnum;
  autoCharge: boolean;
  paymentMethod: string;
  credits: number;
  autoChargeAmount:number;
  leadCost: string;
  buyerId: string;
  signUpFlowStatus:string;
  xeroContactId: string;
  isVerified: boolean;
  verifiedAt: Date;
  isActive: boolean;
  activatedAt: Date;
  isDeleted: boolean;
  rowIndex: number;
  isArchived:boolean;
  invitedById: Types.ObjectId;
  userNotes:string;
  businessDetailsId: Types.ObjectId;
  userLeadsDetailsId: Types.ObjectId;
}
