// Download the helper library from https://www.twilio.com/docs/node/install
// Find your Account SID and Auth Token at twilio.com/console

import { checkAccess } from "../../app/Middlewares/serverAccess";
import { Notifications } from "../../app/Models/Notifications";
import { User } from "../../app/Models/User";
import { NOTIFICATION_TYPE } from "../Enums/notificationType.enum";

// and set the environment variables. See http://twil.io/secure
export const notify = (send_to: String, lead: Record<string, string>) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require("twilio")(accountSid, authToken);
  if (checkAccess()) {
    client.messages
      .create({
        body: `You have a new lead:
         Name:${lead?.name}
         Email: ${lead?.email}
         Phone: ${lead?.phoneNumber}
         Get in touch as soon as possible.`,
        from: process.env.TWILIO_SENDER_PHONE_NUMBER,
          to: send_to,
      })
      .then(async (message: any) => {
        const user = await User.findOne({ smsPhoneNumber: send_to });
        const data = {
          userId: user?.id,
          title: "NEW LEAD",
          notificationType: NOTIFICATION_TYPE.SMS,
          callerIds: message.sid,
        };
        await Notifications.create(data);
        console.log("SMS sent successfully");
      })
      .catch((err: any) => console.log("error while sending SMS", err));
  } else {
    console.log("No Access for SMS sending to this " + process.env.APP_ENV);
  }
};
// notify()
