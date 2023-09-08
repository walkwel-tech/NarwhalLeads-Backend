import { autoChargePayment, weeklypayment } from "./autoCharge"
import { autoWebhookURLHitLeadSubmission } from "./lead_status_update_webhook"
import { mailForTotalLeadsInDay, out_of_funds } from "./sendMail"

export const autoUpdateTasks=()=>{
    autoChargePayment()
    weeklypayment()
    mailForTotalLeadsInDay()
    autoWebhookURLHitLeadSubmission()
    out_of_funds()
}