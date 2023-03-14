import { Document } from "mongoose";

export interface freeCreditsLinkInterface extends Document {
  code: string;

  freeCredits: number;
  useCounts: number;
  maxUseCounts: number;

  isDisabled: boolean;

  userId: []

  isUsed: boolean;

  usedAt: Date;
}
