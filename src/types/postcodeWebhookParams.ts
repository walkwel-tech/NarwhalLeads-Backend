import {CommonWebhookBody} from "./CommonWebhookBody";
import {PostCode} from "./LeadDetailsInterface";
import {County} from "../utils/Functions/flattenPostcodes";

export interface PostcodeWebhookParams extends CommonWebhookBody {

  buyerId?: string;

  businessName: string | undefined;
  businessIndustry?: string;

  topUpAmount?: string | number;
  type?: string;
  postCodeList?: County[] | PostCode[] | string[];
  miles?: string;
  postcode?: PostCode[];
  remainingCredits?: string | number;
  businessSalesNumber?: string;
  leadSchedule?: string[];
  dailyLeadCap?: string | number;
  dailyCap?: string | number;
  weeklyCap?: string | number;
  computedCap?: string | number;
}
