import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import { LeadCenterCredential } from "../../app/Models/LeadCenterCredential";
import logger from "../winstonLogger/logger";
const POST = "post";

export const leadReportWebhook = (data: any) => {
  return new Promise(async (resolve, reject) => {
    const credential = await LeadCenterCredential.findOne();

    let config = {
      method: POST,
      url: `${process.env.LEAD_REPORT_ACCEPTED_WEBHOOK_URL}lead-replacements/add/`,
      headers: {
        "Content-Type": "application/json",
        authorization: `TOKEN ${credential?.token}`,
      },
      data: { data },
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          logger.info(
            "lead Report accepted Webhook webhook hits successfully", 
            { response }
          );
          resolve(response.data);
        })
        .catch((err) => {
          logger.error(
            "lead Report accepted Webhook webhook hits error",
            err
          );

          reject(err.response);
        });
    }
  });
};
