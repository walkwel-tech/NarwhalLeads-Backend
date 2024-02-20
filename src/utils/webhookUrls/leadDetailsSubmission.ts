import axios from "axios";
import { Leads } from "../../app/Models/Leads";
import { handleFailedWebhookURLHitLeadSubmissionOver12Hours } from "../../app/AutoUpdateTasks/leadStatusUpdateWebhook";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import logger from "../winstonLogger/logger";
const POST = "post";
export const leadDetailsSubmission = (data: any) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.LEADS_SUBMISSION_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.LEAD_DETAILS_SUBMISSION_API_KEY,
      },
      data: data,
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          await Leads.findByIdAndUpdate(
            data.id,
            { webhookHits: true },
            { new: true }
          );
        })
        .catch(async (err) => {
          if (data.webhookHitsCounts <= 5) {
            handleFailedWebhookURLHitLeadSubmissionOver12Hours();
            await Leads.findByIdAndUpdate(
              data.id,
              { webhookHitsCounts: data.webhookHitsCounts + 1 },
              { new: true }
            );
          }
        });
    } else {
      logger.info("No Access to this APP_ENV", new Date(), "Today's Date");
    }
  });
};
