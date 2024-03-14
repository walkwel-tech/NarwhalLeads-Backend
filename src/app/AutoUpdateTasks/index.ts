import {cronBuyerStatus} from "./buyerActivations";
import { updateReportStatus } from "./ReportingStatusUpdate/updateReportStatus";
import { activityLogs } from "./activityLogs";
import {autoChargePayment, weeklyPayment} from "./autoCharge";
import { db_dump } from "./db.dump";
import { autoWebhookURLHitLeadSubmission } from "./leadStatusUpdateWebhook";
import { mailForTotalLeadsInDay } from "./sendMail";
import { userSignupReminder } from "./userSignupReminder";

export const autoUpdateTasks = () => {
  autoChargePayment();
  updateReportStatus()
  weeklyPayment();
  mailForTotalLeadsInDay();
  autoWebhookURLHitLeadSubmission();
  activityLogs();
  db_dump();
  userSignupReminder();
  cronBuyerStatus();
};
