import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";

const POST = "post";

export const activity_logs_webhook_url =async (data:any) => {
  
    return new Promise((resolve, reject) => {
      let config = {
        method: POST,
        url: process.env.ACTIVITY_LOGS_WEBHOOK_URL,
        headers: {
          "Content-Type": "application/json",
          "API-KEY": process.env.BUSINESS_DETAILS_SUBMISSION_API_KEY,
        },
        data: {data},
      };
      if (checkAccess()) {
        axios(config)
          .then(async (response) => {
            console.log("fully_signup_with_credits webhook hits successfully", response.data);
          })
          .catch((err) => {
            console.log("fully_signup_with_credits webhook hits error", err.response?.data);
          });
      } else {
        console.log(
          "No Access for hitting business submission webhook to this " +
            process.env.APP_ENV
        );
      }
    });
  };