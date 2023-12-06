import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import { LeadCenterCredential } from "../../app/Models/LeadCenterCredential";
import { EVENT_TITLE, EVENT_TYPE } from "../constantFiles/events";
import { saveEventLogs } from "../Functions/saveLogs";
import { UserInterface } from "../../types/UserInterface";
const POST = "post";
interface leadReportAcceptedWebhookData {
  leadId: string;
  industry: string | undefined;
  client: string | undefined;
  supplier: string | number;
  quantity: number;
  date: Date;
  reason: string;
}
export const leadReportAcceptedWebhook = (
  user: Partial<UserInterface>,
  data: leadReportAcceptedWebhookData
) => {
  const body = JSON.stringify(data);
  return new Promise(async (resolve, reject) => {
    const credential = await LeadCenterCredential.findOne();

    let config = {
      method: POST,
      url: `${process.env.LEAD_REPORT_ACCEPTED_WEBHOOK_URL}lead-replacements/add/`,
      headers: {
        "Content-Type": "application/json",
        authorization: `TOKEN ${credential?.token}`,
      },
      data: body,
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          console.log("lead Report accepted Webhook webhook hits successfully");
          const params = {
            userId: user?._id,
            eventType: EVENT_TYPE.WEBHOOK,
            eventTitle: EVENT_TITLE.LEAD_REPORT_ACCEPTED,
            statusCode: response.status,
            data: response.data,
          };
          saveEventLogs(params);
          resolve(response.data);
        })
        .catch((err) => {
          console.log(
            "lead Report accepted Webhook webhook hits error",
            err.response
          );
          let params = {
            userId: user?._id,
            eventType: EVENT_TYPE.WEBHOOK,
            eventTitle: EVENT_TITLE.LEAD_REPORT_ACCEPTED,
            statusCode: err.response.status,
            data: data,
            notes: err,
          };
          saveEventLogs(params);
          reject(err.response);
        });
    }
  });
};
