import { Document, Types } from "mongoose";

export interface LeadsInterface extends Document {
  _id: Types.ObjectId;
  bid: string;
  status: string;
  leadsCost: number;
  leads: object;
  rowIndex: number;
  invalidLeadReason: string;
  feedbackForNMG: string;
  createdAt: Date;
  reportedAt: Date;
  reportAcceptedAt: Date;
  reportRejectedAt: Date;
  statusUpdatedAt: Date;
  clientNotes: string;
  industryId: Types.ObjectId;
  contactStatus: string;
  webhookHits: boolean;
  webhookHitsCounts: number;
  isReprocessed: boolean;
  reprocessedAt: Date;
}
