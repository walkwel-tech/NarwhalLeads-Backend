import { Document, Types } from "mongoose";

export interface freeCreditsLinkInterface extends Document {
  code: string;
  freeCredits: number;
  useCounts: number;
  maxUseCounts: number;
  isDisabled: boolean;
  isComission: boolean;
  // userId: [];
  // businessDetailsId:[];
  users: [];
  isUsed: boolean;
  usedAt: Date;
  topUpAmount: number;
  spotDiffPremiumPlan: boolean;
  name: string;
  isDeleted: boolean;
  deletedAt: Date;
  accountManager: Types.ObjectId;
  businessIndustryId: Types.ObjectId;
}
