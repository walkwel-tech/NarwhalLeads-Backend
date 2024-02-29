import { checkAccess } from "../../app/Middlewares/serverAccess";
import { CODE } from "../constantFiles/smsNotification.contants";
import logger from "../winstonLogger/logger";

// and set the environment variables. See http://twil.io/secure
export const notify = (send_to: String, lead: Record<string, string>) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require("twilio")(accountSid, authToken);
  let to;
  const dialCodePattern = /^\+44/;
  //@ts-ignore
  const includesDialCode = dialCodePattern.test(send_to);
  if (includesDialCode) {
    to = send_to;
  } else {
    to = `${CODE.DIAL_CODE}${send_to}`;
  }
  if (checkAccess()) {
    client.messages
      .create({
        body: `You have a new lead:
         Name: ${lead?.name}
         Email: ${lead?.email}
         Phone: ${lead?.phoneNumber}
         Get in touch as soon as possible.`,
        from: process.env.TWILIO_SENDER_PHONE_NUMBER,
        statusCallback: `${process.env.APP_URL}/api/v1/notification-webhook`,
        to: to,
      })
      .then(async (message: any) => {
        logger.info("sms sent successfully", { message });
      })
      .catch(async (err: any) => {
        logger.error("error while sending SMS", err);
      });
  } else {
    logger.info(`No Access for SMS sending to this  ${process.env.APP_ENV}`);
  }
};
