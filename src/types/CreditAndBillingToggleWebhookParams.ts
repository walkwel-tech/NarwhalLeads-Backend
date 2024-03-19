import {CommonWebhookBody} from "./CommonWebhookBody";

export interface CreditAndBillingToggleWebhookParams extends CommonWebhookBody {
  isAutoChargeEnabled: boolean;
  businessName: string;
  businessSalesNumber: string;
}
