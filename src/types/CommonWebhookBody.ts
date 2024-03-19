import {Types} from "mongoose";

export interface CommonWebhookBody {
  userId: Types.ObjectId;
  bid?: string;
  eventCode: string;
}
