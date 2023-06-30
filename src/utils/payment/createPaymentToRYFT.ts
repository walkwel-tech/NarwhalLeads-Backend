import axios from "axios";
import { CardDetails } from "../../app/Models/CardDetails";
// import { PaymentInput } from "../../app/Inputs/Payment.input";
import { RyftPaymentMethods } from "../../app/Models/RyftPaymentMethods";
import { User } from "../../app/Models/User";

const POST = "post";
export const createSession = (params:any) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      amount: params.fixedAmount,
      currency: process.env.CURRENCY,
      customerEmail: params.email,
      customerDetails: {
        id: params.clientId
    },
      returnUrl:process.env.RETURN_URL
    });
    const config = {
      method: POST,
      url: process.env.CREATE_SESSION_URL,
      headers: {
        // Account: process.env.ACCOUNT_ID,
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
      console.log("Create session error",err.response.data)

      });
  });
};

export const attemptToPayment = (response: any, params:any) => {
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
        store: true
    }
    });
    const config = {
      method: "post",
      url: process.env.ATTEMPT_TO_PAYMENT,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        Authorization: process.env.RYFT_PUBLIC_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(async function (res) {
        const user:any=await User.findOne({email:params.email})
        await RyftPaymentMethods.create({userId:user.id,ryftClientId:user.ryftClientId, cardId:params.cardId,paymentMethod:res.data.paymentMethod})
        const card=await CardDetails.findById(params.cardId)
        await CardDetails.findByIdAndUpdate(params.cardId,{cardNumber:"000000000000" + card?.cardNumber.slice(-4)})
        resolve(res);
      })
      .catch(function (error) {
        // reject(error);
        console.log('attempt payment error',error.response.data)

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
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };
    axios(config)
      .then(async function (res) {
    console.log('this is',res.data)
        resolve(res);
      })
      .catch(function (error) {
        // reject(error);
        console.log('payment methpods error',error.response.data)

      });
  });
};

export const attemptToPaymentBy_PaymentMethods = (response: any, clientSecret:any) => {
  return new Promise((resolve, reject) => {
    const paymentData = JSON.stringify({
      clientSecret:clientSecret,
      paymentMethod: {
        id: response.data.items[0].id   
    }     
    });
    const config = {
      method: "post",
      url: process.env.ATTEMPT_TO_PAYMENT,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        Authorization: process.env.RYFT_PUBLIC_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(async function (res) {
        resolve(res);
      })
      .catch(function (error) {
        // reject(error);
        console.log('attempt payment by payment methods error',error.response.data)

      });
  });
};


export const refundPayment = (params:any) => {
  return new Promise((resolve, reject) => {
    const paymentData = JSON.stringify({
   amount:params.amount 
    });
    const config = {
      method: "post",
      url: `${process.env.RYFT_REFUND_PAYMENT_URL}/${params.id}/refunds`,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        'Content-Type': 'application/json', 
        'Accept': 'application/json', 
        Authorization: process.env.RYFT_SECRET_KEY,
      },
      data: paymentData,
    };
    axios(config)
      .then(async function (res) {
        console.log("refunded",res.data)
        resolve(res);
      })
      .catch(function (error) {
        // reject(error);
        console.log(error?.response?.data)

      });
  });
};