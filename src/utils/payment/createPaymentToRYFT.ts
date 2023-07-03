import axios from "axios";
import { CardDetails } from "../../app/Models/CardDetails";
// import { PaymentInput } from "../../app/Inputs/Payment.input";
import { RyftPaymentMethods } from "../../app/Models/RyftPaymentMethods";
import { User } from "../../app/Models/User";
import { PAYMENT_STATUS } from "../Enums/payment.status";

const POST = "post";
export const createSession = (params: any) => {
  return new Promise((resolve, reject) => {
    let body = {
      amount: params.fixedAmount,
      currency: process.env.CURRENCY,
      customerEmail: params.email,
      customerDetails: {
        id: params.clientId || null
      },
      returnUrl: process.env.RETURN_URL,
    }
     
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
        // console.log("Create session error", err.response.data);
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
        // console.log("Create session error", err.response.data);
      });
  });
}

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
        if (res.data.status === PAYMENT_STATUS.PENDING_ACTION) {
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
          console.log("Exception Occur")
          throw new Error("Payment Pending");
        }
      })
      .catch(function (error) {
        reject(error);
        // console.log("attempt payment error", error.response.data);
      });
  });
};

export const customerPaymentMethods = (response: any) => {
  return new Promise((resolve, reject) => {
    const config = {
      method: "get",
      url: `${process.env.RYFT_CUSTOMER_PAYMENT_METHOD}/${response.data?.customerDetails?.id}/payment-methods`,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };
    axios(config)
      .then(async function (res) {
        console.log("this is", res.data);
        resolve(res);
      })
      .catch(function (error) {
        reject(error);
        // console.log("payment methpods error", error.response.data);
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
        id: response.data.items[0]?.id,
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
          resolve(res);
        } else {
          console.log("Exception Occur")
          throw new Error("payment pending");
        }
      })
      .catch(function (error) {
        reject(error);
        // console.log(
        //   "attempt payment by payment methods error",
        //   error.response.data
        // );
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
        console.log("refunded", res.data);
        resolve(res);
      })
      .catch(function (error) {
        reject(error);
        // console.log(error?.response?.data);
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
        console.log(JSON.stringify(response.data));
        resolve(response.data);
      })
      .catch(function (error) {
        // console.log(error);
        reject(error)
      });
  })

};
