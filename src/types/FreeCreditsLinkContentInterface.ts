import { Document, Types } from "mongoose";

export interface FreeCreditsLinkContentInterface extends Document {
  _id: Types.ObjectId;
  heroSection: string,
  promoLink: string,
  qualityLeads:string,
  leadShowCase: string,
  badgeTitle: string,
  badgeSubTitle: string,
  badgeColor: string,
  replacementPolicyHeader: string,  
  replacementPolicyText: string,  
  isDeleted: boolean,
  deletedAt: Date,
}
