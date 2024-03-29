import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import logger from "../winstonLogger/logger";

const POST = "post";

interface updateUserDetailsData {
  bid: any;
  businessName: string;
  businessSalesNumber?: string;
  dailyLeads?: string | number;
  leadSchedule?: string;
  postCodeTargettingList?: string;
}
export const clientUpdateWebhookUrl = async (data: updateUserDetailsData) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.CLIENT_UPDATE_WEHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.CLIENT_UPDATE_WEHOOK_KEY,
      },
      data: { data },
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          logger.info(
            "Client Update WebhookUrl webhook hits successfully",
            { response }
          );
          resolve(response.data);
        })
        .catch((err) => {
          logger.error(
            "error while triggering client update webhook url",
            err
          );
          reject(err.response?.data);
        });
    } else {
      logger.info(
        `No Access for hitting client update webhook to this ${process.env.APP_ENV}`
      );
    }
  });
};
