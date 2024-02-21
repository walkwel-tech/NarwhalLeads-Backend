import { Document, Types } from "mongoose";

export interface FreeCreditsLinkContentInterface extends Document {
  _id: Types.ObjectId;
  heroSection: string,
  promoLink: string,
  qualityLeads:string,
  leadShowCase: string,
  badgeTitle: string,
  badgeSubTitle: string,
  badgeColour: string,
  replacementPolicyHeader: string,  
  replacementPolicyText: string,  
  isDeleted: boolean,
  deletedAt: Date,
}
