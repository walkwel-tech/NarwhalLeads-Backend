import axios from "axios";
// import { PaymentInput } from "../../app/Inputs/Payment.input";
import {User} from "../../app/Models/User";
import {UserInterface} from "../../types/UserInterface";
import {PATCH} from "../constantFiles/HttpMethods";
import {cmsUpdateWebhook} from "../webhookUrls/cmsUpdateWebhook";
import logger from "../winstonLogger/logger";

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

        logger.info("Adding credits to buyer", config);

        axios(config)
            .then(async (response) => {
                logger.info("Credits added to buyer", config, response.data);
                const buyerIdUser: UserInterface = await User.findOne({
                    buyerId: params.buyerId,
                    // role: RolesEnum.USER, // If user had Buyer ID then they should be allowed to get updated credits.
                }) ?? {} as UserInterface;
                let updatedCredits: number;
                if (params?.freeCredits) {
                    updatedCredits =
                        buyerIdUser?.credits + params?.fixedAmount + params?.freeCredits;
                    await User.findByIdAndUpdate(buyerIdUser.id, {promoCodeUsed: true});
                } else {
                    updatedCredits = buyerIdUser?.credits + parseInt(params?.fixedAmount || 0);
                }

                try {
                    const updatedUser = await User.findByIdAndUpdate(buyerIdUser?.id, {
                        credits: updatedCredits,
                    }, {new: true});

                    if (updatedUser?.credits && updatedUser?.leadCost && +updatedUser?.credits > +updatedUser?.leadCost) {
                        cmsUpdateWebhook(`data/buyer?buyerId=${updatedUser?.buyerId}`, PATCH, {active: true})
                    }

                    await User.updateMany(
                        {invitedById: buyerIdUser?.id},
                        {
                            $set: {
                                credits: updatedCredits,
                            },
                        }
                    );

                    logger.info(`Credits updated for buyer (${params.buyerId}) in DB now total is (${updatedCredits})`, config, response.data);
                } catch (err) {
                    logger.error("Error in updating credits for buyer", err);
                }

                resolve(response);
            })
            .catch(function (error) {
                reject(error);
            });
    });
};
