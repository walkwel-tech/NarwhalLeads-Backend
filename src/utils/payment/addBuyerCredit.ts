import axios from "axios";
// import { PaymentInput } from "../../app/Inputs/Payment.input";
import { User } from "../../app/Models/User";
import { RolesEnum } from "../../types/RolesEnum";

export const addCreditsToBuyer = (params:any) => {
  console.log(params)
  return new Promise((resolve, reject) => {
    const config = {
      method: "post",
      url: process.env.ADD_BUYER_CREDITS,
      headers: {
        X_KEY: process.env.LEAD_BYTE_API_KEY,
      },
      data: {
        BID: params.buyerId,
        amount: parseInt(params.fixedAmount) + (params?.freeCredits || 0),
      },
    };
    axios(config)
      .then(async (response) => {
        const buyerIdUser:any = await User.findOne({ buyerId: params.buyerId , role:RolesEnum.USER});
          let updatedCredits:any;
          if(params?.freeCredits){
            updatedCredits=buyerIdUser?.credits + params?.fixedAmount+params?.freeCredits
          }
          else{
            updatedCredits=buyerIdUser?.credits + parseInt(params?.fixedAmount)
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
