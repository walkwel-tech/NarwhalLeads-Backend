import axios from "axios";
// import { PaymentInput } from "../../app/Inputs/Payment.input";
import { User } from "../../app/Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { UserInterface } from "../../types/UserInterface";

export const addCreditsToBuyer = (params: any) => {
  return new Promise((resolve, reject) => {
    const config = {
      method: "post",
      url: process.env.ADD_BUYER_CREDITS,
      headers: {
        X_KEY: process.env.LEAD_BYTE_API_KEY,
      },
      data: {
        BID: params.buyerId,
        amount:
          parseInt(params?.fixedAmount) + parseInt(params?.freeCredits || 0),
      },
    };
    axios(config)
      .then(async (response) => {
        const buyerIdUser: UserInterface = await User.findOne({
          buyerId: params.buyerId,
          role: RolesEnum.USER,
        }) ?? {} as UserInterface;
        let updatedCredits: number;
        if (params?.freeCredits) {
          updatedCredits =
            buyerIdUser?.credits + params?.fixedAmount + params?.freeCredits;
          await User.findByIdAndUpdate(buyerIdUser.id, { promoCodeUsed: true });
        } else {
          updatedCredits = buyerIdUser?.credits + parseInt(params?.fixedAmount || 0);
        }
        await User.findByIdAndUpdate(buyerIdUser?.id, {
          credits: updatedCredits,
        });

        await User.updateMany(
          { invitedById: buyerIdUser?.id },
          {
            $set: {
              credits: updatedCredits,
            },
          }
        );

        resolve(response);
      })
      .catch(function (error) {
        reject(error);
      });
  });
};
