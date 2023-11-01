import Stripe from "stripe";
const stripe = new Stripe(`${process.env.STRIPE_SECRET_KEY}`, {
  //fixme:
  apiVersion: "2023-08-16",
});
export const getStripePaymentMethods = async (clientSecret: string) => {
  const setupIntent = await stripe.setupIntents.retrieve(clientSecret);
  return setupIntent;
};

export const getUserDetailsByPaymentMethods = async (clientSecret: string) => {
  const userDetails = await stripe.paymentMethods.retrieve(clientSecret);
  return userDetails;
};
