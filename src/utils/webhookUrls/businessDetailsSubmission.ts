import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import { saveEventLogs } from "../Functions/saveLogs";
import { User } from "../../app/Models/User";
import { EVENT_TITLE, EVENT_TYPE } from "../constantFiles/events";
import logger from "../winstonLogger/logger";
const POST = "post";
export const businessDetailsSubmission = (data: any) => {
  data.APP_ENV = process.env.APP_ENV;
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.BUSINESS_DETAILS_SUBMISSION_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.BUSINESS_DETAILS_SUBMISSION_API_KEY,
      },
      data: data,
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          logger.info(
            "business data webhook hits successfully",
            { response }
          );
          const user = await User.findOne({ email: data.email });
          //fixme:
          const params = {
            userId: user?._id,
            eventType: EVENT_TYPE.WEBHOOK,
            eventTitle: EVENT_TITLE.BUSINESS_DETAILS_SUBMISSION,
            statusCode: response.status,
            data: response.data,
          };
          saveEventLogs(params);
        })
        .catch((err) => {
          logger.error(
            "business data webhook hits error",
            err
          );
        });
    } else {
      logger.info(`No Access for hitting business submission webhook to this ${process.env.APP_ENV}`);
    }
  });
};
