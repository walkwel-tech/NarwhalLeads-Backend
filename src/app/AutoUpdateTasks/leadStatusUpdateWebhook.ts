import { leadDetailsSubmission } from "../../utils/webhookUrls/leadDetailsSubmission";
import { Leads } from "../Models/Leads";
const cron = require("node-cron");


export function autoWebhookURLHitLeadSubmission() {
  
    // Schedule a job to send batched updates at the top of each hour
    cron.schedule("0 * * * *", () => {
      sendBatchedUpdates();
    });
  }


export async function sendBatchedUpdates():Promise<any> {
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
 return  updatesToBeSent.map((i)=>{
       return  leadDetailsSubmission(i)
      .then((response) => {
        console.log("Batched updates sent successfully.");
      })
      .catch((error) => {
        console.error("Error sending batched updates:", error);
      });
    })
   
  }
}



export function handleFailedWebhookURLHitLeadSubmissionOver12Hours() {

  cron.schedule('0 */12 * * *', () => {
//   cron.schedule("* * * * *", () => {
    console.log("Enter autoWebhookURLHitLeadSubmissionOver12Hours cron");

    sendBatchedUpdates();
  });
}
