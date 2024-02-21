import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import logger from "../winstonLogger/logger";

const POST = "post";

export const activityLogsWebhookUrl = async (data: any) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.ACTIVITY_LOGS_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.BUSINESS_DETAILS_SUBMISSION_API_KEY,
      },
      data: { data },
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          logger.info(
            "activityLogsWebhookUrl webhook hits successfully",
            { response }
          );
        })
        .catch((err) => {
          logger.error(
            "activityLogsWebhookUrl webhook hits error",
            err
          );
        });
    } else {
      logger.info(
        `No Access for hitting activity logs webhook to this ${process.env.APP_ENV}`
      );
    }
  });
};
