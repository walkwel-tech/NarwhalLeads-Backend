import { activityLogs } from "./activityLogs";
import { autoChargePayment, weeklypayment } from "./autoCharge";
import { db_dump } from "./db.dump";
import { autoWebhookURLHitLeadSubmission } from "./leadStatusUpdateWebhook";
import { mailForTotalLeadsInDay } from "./sendMail";
import { userSignupReminder } from "./userSignupReminder";

export const autoUpdateTasks = () => {
  autoChargePayment();
  weeklypayment();
  mailForTotalLeadsInDay();
  autoWebhookURLHitLeadSubmission();
  activityLogs();
  db_dump();
  userSignupReminder();
};
