import { PaymentInput } from "../../app/Inputs/Payment.input";
import { addCreditsToBuyer } from "./addBuyerCredit";
import { attemptToPayment, attemptToPaymentBy_PaymentMethods, createSession, customerPaymentMethods, refundPayment } from "./createPaymentToRYFT";

export const managePayments = (params: PaymentInput) => {
    return new Promise((resolve, reject) => {
      createSession(params)
        .then((response: any) => {
          attemptToPayment(response,params)
            .then((data) => {
              addCreditsToBuyer(params).then((res)=>{
                  resolve(res)
              }).catch((err)=>{
                  reject(err.response?.data)
              })
            })
            .catch((err) => {
              reject(err.response?.data);
            });
        })
        .catch((err) => {
          reject(err.response?.data);
        });
    });
  };


  export const  managePaymentsByPaymentMethods = (params:any) => {
    return new Promise((resolve, reject) => {
      createSession(params)
        .then((res: any) => {
          customerPaymentMethods(res).then((response:any)=>{
              attemptToPaymentBy_PaymentMethods(response,res.data.clientSecret)
            .then((data) => {
              addCreditsToBuyer(params).then((res)=>{
                console.log("credits added")

                  resolve(res)
              }).catch((err)=>{
                  reject(err.response?.data)
              })
            })          
            .catch((err) => {
              reject(err.response?.data);
            });
          })
          .catch((err)=>{
            reject(err.response?.data)
          })
        
        })
        .catch((err) => {
          reject(err.response?.data);
        });
    });
  };


  export const managePaymentsForWeeklyPayment = (params: PaymentInput) => {
    return new Promise((resolve, reject) => {
      createSession(params)
        .then((response: any) => {
          attemptToPaymentBy_PaymentMethods(response,response.data.clientSecret)
            .then((data) => {
              resolve(data)
            })
            .catch((err) => {
              reject(err.response?.data);
            });
        })
        .catch((err) => {
          reject(err.response?.data);
        });
    });
  };
  

  export const managePaymentsWithRefund = (params: PaymentInput) => {
    return new Promise((resolve, reject) => {
      createSession(params)
        .then((response: any) => {
          attemptToPayment(response,params)
            .then((data:any) => {
              setTimeout(() => {
                refundPayment(data?.data).then((res:any)=>{
                  resolve(res)
                })
                .catch((err)=>{reject(err.response?.data)})
              }, 300000);
             
            })
            .catch((err) => {
              reject(err.response?.data);
            });
        })
        .catch((err) => {
          reject(err.response?.data);
        });
    });
  };
