import { activityLogs } from "./activityLogs"
import { autoChargePayment, weeklypayment } from "./autoCharge"
import { autoWebhookURLHitLeadSubmission } from "./lead_status_update_webhook"
import { mailForTotalLeadsInDay, outOfFunds } from "./sendMail"

export const autoUpdateTasks=()=>{
    autoChargePayment()
    weeklypayment()
    mailForTotalLeadsInDay()
    autoWebhookURLHitLeadSubmission()
    outOfFunds()
    activityLogs()
}