import { Types } from "mongoose";
import { Document } from "mongoose";

export interface UserServiceInterface extends Document {
    _id: Types.ObjectId;
    userId:Types.ObjectId;
    financeOffers:boolean;
    prices:string;
    accreditations:[];
    avgInstallTime:string;
    trustpilotReviews:string;
    criteria:[]
  }