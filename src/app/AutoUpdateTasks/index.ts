import { activityLogs } from "./activityLogs"
import { autoChargePayment, weeklypayment } from "./autoCharge"
import { autoWebhookURLHitLeadSubmission } from "./leadStatusUpdateWebhook"
import { mailForTotalLeadsInDay, outOfFunds } from "./sendMail"

export const autoUpdateTasks=()=>{
    autoChargePayment()
    weeklypayment()
    mailForTotalLeadsInDay()
    autoWebhookURLHitLeadSubmission()
    outOfFunds()
    activityLogs()
}