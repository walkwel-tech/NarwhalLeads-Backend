import axios from "axios";
import { PaymentInput } from "../../app/Inputs/Payment.input";
import { User } from "../../app/Models/User";

export const addCreditsToBuyer = (params: PaymentInput) => {
  return new Promise((resolve, reject) => {
    const config = {
      method: "post",
      url: process.env.ADD_BUYER_CREDITS,
      headers: {
        X_KEY: process.env.LEAD_BYTE_API_KEY,
      },
      data: {
        BID: params.buyerId,
        amount: params.fixedAmount+params?.freeCredits,
      },
    };
    axios(config)
      .then(async (response) => {
        const buyerIdUser = await User.findOne({ buyerId: params.buyerId });
        if (buyerIdUser?.credits) {
          await User.findByIdAndUpdate(buyerIdUser?.id, {
            credits: buyerIdUser?.credits + params.fixedAmount+params.freeCredits,
          });
          await User.findByIdAndUpdate({invitedById:buyerIdUser?.id}, {
            credits: buyerIdUser?.credits + params.fixedAmount+params.freeCredits,
          });
        
        } else {
          await User.findByIdAndUpdate(buyerIdUser?.id, {
            credits: params.fixedAmount+params.freeCredits,
          });
          await User.findByIdAndUpdate({invitedById:buyerIdUser?.id}, {
            credits: params.fixedAmount+params.freeCredits,
          });
        }
        resolve(response);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};
