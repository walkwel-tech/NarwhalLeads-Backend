import { UserInterface } from '../../types/UserInterface';
import axios from "axios";
const POST = "post";

function configureWebhook() {
    const webhookURL = process.env.PAYMENT_FAILED_NOTIFICATION_WEBHOOK_URL;
    return { webhookURL };
}

const { webhookURL } = configureWebhook();

export const paymentFailedWebhook = async (
  { firstName, lastName, phoneNumber, id, email }: UserInterface,
  intentId: string,
  businessName: string,
  message: string,
  businessIndustry: string
) => {
  return new Promise(async (resolve, reject) => {
    if (!webhookURL) {
      console.error("Error: Webhook is not configured.", new Date());
      reject("Error: Webhook is not configured.");
    }

    let data = ` ${message} having the following details -->
                        Full Name: ${firstName}
                        Last Name: ${lastName}
                        Mobile Number: ${phoneNumber}
                        User ID: ${id}
                        Intent ID: ${intentId}`;

    const text = JSON.stringify({
      text: data,
      firstName,
      lastName,
      phoneNumber,
      id,
      intentId,
      businessName,
      businessIndustry,
      email,
    });

    let config = {
      method: POST,
      url: webhookURL,
      headers: {
        "Content-Type": "application/json",
      },
      data: text,
    };

    axios(config)
      .then((response) => {
        console.log("Payment failed webhook triggered @", new Date(), response);
        resolve(response);
      })
      .catch((err) => {
        console.error(
          "There was an error triggering payment failed Webhook @",
          new Date(),
          JSON.stringify(err.message)
        );
        reject(err);
      });
  });
};