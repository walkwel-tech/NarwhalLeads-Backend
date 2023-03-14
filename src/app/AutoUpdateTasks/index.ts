import { autoChargePayment, weeklypayment } from "./autoCharge"
import { mailForTotalLeadsInDay } from "./sendMail"

export const autoUpdateTasks=()=>{
    autoChargePayment()
    weeklypayment()
    mailForTotalLeadsInDay()
}