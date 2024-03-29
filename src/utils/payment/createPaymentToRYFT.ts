import axios from "axios";
import { CardDetails } from "../../app/Models/CardDetails";
// import { PaymentInput } from "../../app/Inputs/Payment.input";
import { RyftPaymentMethods } from "../../app/Models/RyftPaymentMethods";
import { User } from "../../app/Models/User";
import { PAYMENT_STATUS } from "../Enums/payment.status";
import { Transaction } from "../../app/Models/Transaction";
import { TRANSACTION_STATUS } from "../Enums/transaction.status.enum";
import { transactionTitle } from "../Enums/transaction.title.enum";
import { PAYMENT_TYPE } from "../constantFiles/ryftPayment.constant";

const POST = "post";

export const createSession = (params: any) => {
  return new Promise((resolve, reject) => {
    let body = {
      amount: params.amount,
      currency: process.env.CURRENCY,
      customerEmail: params.email,
      customerDetails: {
        id: params.clientId || null,
      },

      returnUrl: process.env.RETURN_URL,
    };

    const data = JSON.stringify(body);

    const config = {
      method: POST,
      url: process.env.CREATE_SESSION_URL,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
      data: data,
    };
    axios(config)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteCustomerById = (customerId: any) => {
  //
  return new Promise((resolve, reject) => {
    const config = {
      method: "DELETE",
      url: `https://api.ryftpay.com/v1/customers/${customerId}`,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };
    axios(config)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const attemptToPayment = (response: any, params: any) => {
  return new Promise((resolve, reject) => {
    const paymentData = JSON.stringify({
      clientSecret: response.data.clientSecret,
      cardDetails: {
        number: params.cardNumber,
        expiryMonth: params.expiryMonth,
        expiryYear: params.expiryYear,
        cvc: params.cvc,
      },
      paymentMethodOptions: {
        store: true,
      },
    });
    const config = {
      method: "post",
      url: process.env.ATTEMPT_TO_PAYMENT,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_PUBLIC_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(async function (res) {
        if (res.data.status === PAYMENT_STATUS.APPROVED) {
          const user: any = await User.findOne({ email: params.email });
          await RyftPaymentMethods.create({
            userId: user.id,
            ryftClientId: user.ryftClientId,
            cardId: params.cardId,
            paymentMethod: res.data.paymentMethod,
          });
          const card = await CardDetails.findById(params.cardId);
          await CardDetails.findByIdAndUpdate(params.cardId, {
            cardNumber: "000000000000" + card?.cardNumber.slice(-4),
          });
          resolve(res);
        } else {
          throw new Error("Payment Pending");
        }
      })
      .catch(function (error) {
        reject(error);
      });
  });
};

export const customerPaymentMethods = (id: string) => {
  return new Promise((resolve, reject) => {
    const config = {
      method: "get",
      url: `${process.env.RYFT_CUSTOMER_PAYMENT_METHOD}/${id}/payment-methods`,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };
    axios(config)
      .then(async function (res) {
        resolve(res);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};

export const attemptToPaymentBy_PaymentMethods = (
  response: any,
  clientSecret: any
) => {
  return new Promise((resolve, reject) => {
    const paymentData = JSON.stringify({
      clientSecret: clientSecret,
      paymentMethod: {
        id: response.paymentId || response.paymentMethodId,
      },
    });
    const config = {
      method: "post",
      url: process.env.ATTEMPT_TO_PAYMENT,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_PUBLIC_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(async function (res) {
        resolve(res);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};

export const refundPayment = (params: any) => {
  return new Promise((resolve, reject) => {
    const paymentData = JSON.stringify({
      amount: params.amount,
    });
    const config = {
      method: "post",
      url: `${process.env.RYFT_REFUND_PAYMENT_URL}/${params.id}/refunds`,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(async function (res) {
        resolve(res);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};

export const getPaymentMethodByPaymentSessionID = (
  paymentSessionID: string
) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: "get",
      url: `${process.env.RYFT_PAYMENT_METHODS_BY_PAYMENT_SESSION_ID}/${paymentSessionID}`,
      headers: {
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };

    axios(config)
      .then(function (response) {
        resolve(response.data);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};

export const createSessionInitial = (params: any) => {
  return new Promise(async (resolve, reject) => {
    let body = {
      //@ts-ignore
      amount: parseInt(params?.fixedAmount * 100) || 0,
      currency: process.env.CURRENCY,
      customerEmail: params.email,
      customerDetails: {
        id: params.clientId || null,
      },
      returnUrl: process.env.RYFT_RETURN_URL,
      verifyAccount: true,
      paymentType: "Unscheduled",
    };
    if (params?.fixedAmount && params.fixedAmount > 0) {
      body.verifyAccount = false;
    }
    const user = await User.findOne({ email: params.email });
    const card = await CardDetails.findOne({
      paymentMethod: params.paymentMethodId,
      isDeleted: false,
    });
    const data = JSON.stringify(body);
    const config = {
      method: POST,
      url: process.env.CREATE_SESSION_URL,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
      data: data,
    };
    axios(config)
      .then(async (response) => {
        await Transaction.create({
          userId: user?.id,
          leadCost: user?.leadCost,
          cardId: card?.id,
          amount: params?.fixedAmount * 100 || 0,
          status: TRANSACTION_STATUS.SUCCESS,
          paymentSessionId: card?.paymentSessionID,
          paymentMethod: card?.paymentMethod,
          title: transactionTitle.SESSION_CREATED,
        });
        resolve(response);
      })
      .catch(async (err) => {
        await Transaction.create({
          userId: user?.id,
          leadCost: user?.leadCost,
          cardId: card?.id,
          amount: params?.fixedAmount * 100 || 0,
          status: TRANSACTION_STATUS.FAIL,
          paymentSessionId: card?.paymentSessionID,
          paymentMethod: card?.paymentMethod,
          title: transactionTitle.SESSION_CREATED,
          notes: err?.response?.data?.errors[0].message,
        });
        reject(err);
      });
  });
};

export const attemptToPaymentInitial = (params: any) => {
  return new Promise((resolve, reject) => {
    const paymentData = JSON.stringify({
      clientSecret: params.clientSecret,
    });
    const config = {
      method: "post",
      url: process.env.ATTEMPT_TO_PAYMENT,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_PUBLIC_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(async function (res) {
        resolve(res);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};

export const createSessionUnScheduledPayment = async (params: any) => {
  params.fixedAmount = parseInt(params?.fixedAmount);
  return new Promise(async (resolve, reject) => {
    let body = {
      amount: params?.fixedAmount * 100 || 0,
      currency: process.env.CURRENCY,
      customerEmail: params.email,
      customerDetails: {
        id: params.clientId || null,
      },
      paymentType: PAYMENT_TYPE.UNSCHEDULED,
      previousPayment: {
        // must reference an initial 3DS mandated payment in the series
        id: params.paymentSessionId,
      },
      attemptPayment: {
        // immediately charge the card on creation of this payment session
        paymentMethod: {
          id: params.paymentMethodId, // must match the card used on the initial payment
        },
      },
    };
    const user = await User.findOne({ email: params.email });
    const card = await CardDetails.findOne({
      paymentMethod: params.paymentMethodId,
      isDeleted: false,
    });
    const data = JSON.stringify(body);
    const config = {
      method: POST,
      url: process.env.CREATE_SESSION_URL,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
      data: data,
    };
    axios(config)
      .then(async (response) => {
        await Transaction.create({
          userId: user?.id,
          leadCost: user?.leadCost,
          cardId: card?.id,
          amount: params?.fixedAmount * 100 || 0,
          status: TRANSACTION_STATUS.SUCCESS,
          paymentSessionId: card?.paymentSessionID,
          paymentMethod: card?.paymentMethod,
          title: transactionTitle.SESSION_CREATED,
        });
        resolve(response);
      })
      .catch(async (err) => {
        await Transaction.create({
          userId: user?.id,
          leadCost: user?.leadCost,
          cardId: card?.id,
          amount: params?.fixedAmount * 100 || 0,
          status: TRANSACTION_STATUS.FAIL,
          paymentSessionId: card?.paymentSessionID,
          paymentMethod: card?.paymentMethod,
          title: transactionTitle.SESSION_CREATED,
          notes: err?.response?.data?.errors[0]?.message,
        });
        reject(err);
      });
  });
};
