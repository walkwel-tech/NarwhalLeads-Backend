import { leadDetailsSubmission } from "../../utils/webhookUrls/leadDetailsSubmission";
import { Leads } from "../Models/Leads";
import * as cron from "node-cron";
import logger from "../../utils/winstonLogger/logger";

export function autoWebhookURLHitLeadSubmission() {
  // Schedule a job to send batched updates at the top of each hour
  cron.schedule("0 * * * *", () => {
    sendBatchedUpdates();
  });
}

export async function sendBatchedUpdates(): Promise<any> {
  const currentTime = Date.now();
  const updatesToBeSent = [];
  let leadStatusUpdates = await Leads.find({ webhookHits: false });

  for (const id in leadStatusUpdates) {
    const update = leadStatusUpdates[id];
    //@ts-ignore
    if (currentTime - update.statusUpdatedAt <= 3600000) {
      // Within the last hour
      updatesToBeSent.push(update);
      delete leadStatusUpdates[id]; // Remove sent updates from the data structure
    }
  }
  if (updatesToBeSent.length > 0) {
    // Send the batched updates to the webhook URL using Axios (or your preferred HTTP library)
    //create foreach for all status upda
    return updatesToBeSent.map((data) => {
      return leadDetailsSubmission(data)
        .then((response) => {
          logger.info(
            "Batched updates sent successfully.",
            new Date(),
            "Today's Date"
          );
        })
        .catch((error) => {
          logger.error("Error sending batched updates:", error, new Date(), "Today's Date");
        });
    });
  }
}

export function handleFailedWebhookURLHitLeadSubmissionOver12Hours() {
  cron.schedule("0 */12 * * *", () => {
    //   cron.schedule("* * * * *", () => {

    sendBatchedUpdates();
  });
}
