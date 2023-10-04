import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";

const POST = "post";

export const leadReprocessWebhook = async (leadData: Object) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.LEAD_REPROCESS_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.LEAD_REPROCESS_SECRET_KEY,
      },
      data: leadData,
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          console.log("Lead Process webhook hits successfully", response.data);
        })
        .catch((err) => {
          console.log("Lead Process webhook hits error", err.response?.data);
        });
    } else {
      console.log(
        "No Access for hitting Lead Process webhook to this " +
          process.env.APP_ENV
      );
    }
  });
};
