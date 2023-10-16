import { IntentInterface } from "./paymentIntent";
import axios from "axios";
const qs = require("qs");
const POST = "post";
export const createPaymentOnStrip = async (params: IntentInterface) => {
  return new Promise((resolve, reject) => {
    let data = qs.stringify({
      amount: params.amount,
      currency: process.env.CURRENCY,
      automatic_payment_methods: { enabled: true },
      customer: params.customer,
      return_url: process.env.RETURN_URL,
      confirm: true,
      payment_method: params.paymentMethod,
    });

    let config = {
      method: POST,
      maxBodyLength: Infinity,
      url: process.env.STRIPE_MAKE_PAYMENT_URL,
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    };

    axios
      .request(config)
      .then((response: any) => {
        resolve(response.data);
      })
      .catch((error: any) => {
        reject(error);
      });
  });
};
