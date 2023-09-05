import { Document } from "mongoose";

export interface freeCreditsLinkInterface extends Document {
  code: string;
  freeCredits: number;
  useCounts: number;
  maxUseCounts: number;
  isDisabled: boolean;
  userId: [];
  businessDetailsId:[];
  isUsed: boolean;
  usedAt: Date;
  topUpAmount:number;
  spotDiffPremiumPlan:boolean;
  name:string;
  isDeleted:boolean;
  deletedAt:Date
}
