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
        amount: params.fixedAmount + (params?.freeCredits || 0),
      },
    };
    axios(config)
      .then(async (response) => {
        const buyerIdUser:any = await User.findOne({ buyerId: params.buyerId });
          let updatedCredits:any;
          if(params?.freeCredits){
            updatedCredits=buyerIdUser?.credits + params?.fixedAmount+params?.freeCredits
          }
          else{
            updatedCredits=buyerIdUser?.credits + params?.fixedAmount
          }
          await User.findByIdAndUpdate(buyerIdUser.id, {
            credits: updatedCredits,
          });

          await User.updateMany({invitedById:buyerIdUser?.id}, {$set:{
            credits: updatedCredits,
          }});

        resolve(response);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};
