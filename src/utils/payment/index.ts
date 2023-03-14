import { PaymentInput } from "../../app/Inputs/Payment.input";
import { addCreditsToBuyer } from "./addBuyerCredit";
import { attemptToPayment, createSession } from "./createPaymentToRYFT";

export const managePayments = (params: PaymentInput) => {
    return new Promise((resolve, reject) => {
      createSession(params)
        .then((response: any) => {
          attemptToPayment(response,params)
            .then((data) => {
              addCreditsToBuyer(params).then((res)=>{
                  resolve(res)
              }).catch((err)=>{
                  reject(err)
              })
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch((err) => {
          reject(err);
        });
    });
  };

  export const managePaymentsForWeeklyPayment = (params: PaymentInput) => {
    return new Promise((resolve, reject) => {
      createSession(params)
        .then((response: any) => {
          attemptToPayment(response,params)
            .then((data) => {
              resolve(data)
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
  
