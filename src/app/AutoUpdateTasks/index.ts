import { activityLogs } from "./activityLogs"
import { autoChargePayment, weeklypayment } from "./autoCharge"
import { db_dump } from "./db.dump"
import { autoWebhookURLHitLeadSubmission } from "./leadStatusUpdateWebhook"
import { mailForTotalLeadsInDay, outOfFunds } from "./sendMail"

export const autoUpdateTasks=()=>{
    autoChargePayment()
    weeklypayment()
    mailForTotalLeadsInDay()
    autoWebhookURLHitLeadSubmission()
    outOfFunds()
    activityLogs()
    db_dump()
}