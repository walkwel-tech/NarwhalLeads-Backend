import { checkAccess } from "../../app/Middlewares/serverAccess";

// and set the environment variables. See http://twil.io/secure
export const notify = (send_to: String, lead: Record<string, string>) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require("twilio")(accountSid, authToken);
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
          to: `+44${send_to}`,

      })
      .then(async (message: any) => {
        console.log("SMS sent successfully");
      })
      .catch(async(err: any) => {
        console.log("error while sending SMS", err)});
  } else {
    console.log("No Access for SMS sending to this " + process.env.APP_ENV);
  }
};
