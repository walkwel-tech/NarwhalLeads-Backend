import Stripe from "stripe";
import { SRIPE_CONSTANT } from "../../constantFiles/stripeConstants";
const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  //fixme:
  apiVersion: "2023-08-16",
});

export interface IntentInterface {
  usage?: string;
  payment_method_types?: string[];
  customer: string;
  amount?: number;
  currency?: string;
  automatic_payment_methods?: object;
  paymentMethod?: string;
}

export const paymentIntent = async (params: {
  amount: number;
  clientId: string;
}) => {
  try {
    let param: IntentInterface = {
      customer: params.clientId,
    };
    let data;
    if (params.amount === 0) {
      param.usage = SRIPE_CONSTANT.OFF_SESSION;
      param.payment_method_types = [SRIPE_CONSTANT.CARD];
      data = await stripe.setupIntents.create({
        //fixme:
        usage: "off_session",
        payment_method_types: [SRIPE_CONSTANT.CARD],
        customer: params.clientId,
      });
    } else {
      data = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: `${process.env.STRIPE_CURRENCY}`,
        // customer: params.clientId,
        automatic_payment_methods: { enabled: true },
        // return_url: "http://localhost:3004/api/v1/cardDetails/test2",
        // confirm: true,
      });
    }
    return data;
  } catch (err) {
    return err;
  }
};
