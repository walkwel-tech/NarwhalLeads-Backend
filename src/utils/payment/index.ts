import axios from "axios";
import { PaymentInput } from "../../app/Inputs/Payment.input";
// import { RyftPaymentMethods } from "../../app/Models/RyftPaymentMethods";
// import { User } from "../../app/Models/User";
import { addCreditsToBuyer } from "./addBuyerCredit";
import { attemptToPayment, attemptToPaymentBy_PaymentMethods, createSession, createSessionInitial, refundPayment } from "./createPaymentToRYFT";

export const managePayments = (params: PaymentInput) => {
    return new Promise((resolve, reject) => {
      createSession(params)
        .then((response: any) => {
          attemptToPayment(response,params)
            .then((data:any) => {
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

export const fetchPaymentSessionById = (id:string)=>{
  return new Promise((resolve, reject) => {
    const config = {
      method: "GET",
      url: `https://api.ryftpay.com/v1/payment-sessions/${id}`,
      headers: {
        // Account: process.env.ACCOUNT_ID,
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };
    axios(config)
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        // reject(err);
      });
  });
}


  export const  managePaymentsByPaymentMethods = (params:any) => {

    return new Promise((resolve, reject) => {
      createSessionInitial(params)
        .then(async(res: any) => {
              attemptToPaymentBy_PaymentMethods(params?.paymentId,res.data.clientSecret)
            .then((data:any) => {
              data.data.clientSecret=res.data.clientSecret
              data.data.optionalData=res.data
              resolve(data)
            })          
            .catch((err) => {
              reject(err.response?.data);
            });
          })
          // .catch((err)=>{
          //   reject(err.response?.data)
          // })
        
        // })
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


  export const manageInitialPayments = (params: PaymentInput) => {
      return new Promise((resolve, reject) => {
        createSessionInitial(params)
          .then((response: any) => {
            attemptToPayment(response,params)
              .then((data:any) => {  
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
