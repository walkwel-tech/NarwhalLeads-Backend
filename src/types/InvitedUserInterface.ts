import { Document, Types } from "mongoose";

import { RolesEnum } from "./RolesEnum";

export interface InvitedUserInterface extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: RolesEnum;
  invitedByUser: Types.ObjectId;
  businessId: Types.ObjectId;
  isVerified: boolean;
  verifiedAt: Date;
  isActive: boolean;
  activatedAt: Date;
  isDeleted: boolean;
  rowIndex:number
}
