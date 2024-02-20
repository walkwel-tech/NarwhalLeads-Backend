import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import logger from "../winstonLogger/logger";

const POST = "post";

export const fullySignupForNonBillableClients = async (details: Object) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.NON_BILLABLE_CLIENT_SIGNUP_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.BUSINESS_DETAILS_SUBMISSION_API_KEY,
      },
      data: details,
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          logger.info(
            "fullySignupForNonBillableClients webhook hits successfully",
            response.data,
            new Date(),
            "Today's Date"
          );
        })
        .catch((err) => {
          logger.error(
            "fullySignupForNonBillableClients webhook hits error",
            err.response?.data,
            new Date(),
            "Today's Date"
          );
        });
    } else {
      logger.info(
        "No Access for hitting business submission webhook to this " +
          process.env.APP_ENV,
        new Date(),
        "Today's Date"
      );
    }
  });
};
