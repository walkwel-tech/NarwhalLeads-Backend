import axios from "axios";
import { PaymentInput } from "../../app/Inputs/Payment.input";

const POST = "post";
export const createSession = (params: PaymentInput) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      amount: params.fixedAmount,
      currency: process.env.CURRENCY,
      customerEmail: params.email,
      returnUrl:process.env.RETURN_URL
    });
    const config = {
      method: POST,
      url: process.env.CREATE_SESSION_URL,
      headers: {
        Account: process.env.ACCOUNT_ID,
    'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        Authorization: process.env.RYFT_SECRET_KEY,
      },
      data: data,
    };
    axios(config)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
      // reject(err);
      console.log(err)

      });
  });
};

export const attemptToPayment = (response: any, params: PaymentInput) => {
  return new Promise((resolve, reject) => {
    const paymentData = JSON.stringify({
      clientSecret: response.data.clientSecret,
      cardDetails: {
        number: params.cardNumber,
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
        cvc: params.cvc,
      },
    });
    const config = {
      method: "post",
      url: process.env.ATTEMPT_TO_PAYMENT,
      headers: {
        Account: process.env.ACCOUNT_ID,
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        Authorization: process.env.RYFT_PUBLIC_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(function (res) {
        resolve(res);
      })
      .catch(function (error) {
        // reject(error);
        console.log(error)

      });
  });
};
