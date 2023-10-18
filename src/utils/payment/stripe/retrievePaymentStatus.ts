import Stripe from "stripe";
const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  //fixme:
  apiVersion: "2023-08-16",
});

export const getPaymentStatus = async (PID: string) => {
  const intent = await stripe.paymentIntents.retrieve(PID);
  return intent;
};
