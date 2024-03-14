import { Response} from "express"
import { User } from "../../../Models/User";
import { UserInterface } from "../../../../types/UserInterface";
import { TransactionInterface } from "../../../../types/TransactionInterface";
import { PAYMENT_STATUS } from "../../../../utils/Enums/payment.status";
import { transactionTitle } from "../../../../utils/Enums/transaction.title.enum";
import { addCreditsToBuyer } from "../../../../utils/payment/addBuyerCredit";
import { Transaction } from "../../../Models/Transaction";
import { generatePDF, generatePDFParams } from "../../../../utils/XeroApiIntegration/generatePDF";
import { AxiosResponse } from "axios";
import { XeroResponseInterface } from "../../../../types/XeroResponseInterface";
import { InvoiceInterface } from "../../../../types/InvoiceInterface";
import { Invoice } from "../../../Models/Invoice";
import logger from "../../../../utils/winstonLogger/logger";
import { refreshToken } from "../../../../utils/XeroApiIntegration/createContact";
import { BusinessDetailsInterface, isBusinessObject } from "../../../../types/BusinessInterface";
import { UserLeadsDetails } from "../../../Models/UserLeadsDetails";
import { UserLeadsDetailsInterface } from "../../../../types/LeadDetailsInterface";
import { PostcodeWebhookParams, eventsWebhook } from "../../../../utils/webhookUrls/eventExpansionWebhook";
import { EVENT_TITLE } from "../../../../utils/constantFiles/events";
import { calculateVariance } from "../../../../utils/Functions/calculateVariance";
import { POSTCODE_TYPE } from "../../../../utils/Enums/postcode.enum";
import { flattenPostalCodes } from "../../../../utils/Functions/flattenPostcodes";

export const userCreditsManualAdjustmentAction = async (req: any, res: Response) => {
    try {
      const input = req.body;
      const user =
        (await User.findById(input.userId)
          .populate("userLeadsDetailsId")
          .populate("businessDetailsId")) ?? ({} as UserInterface);
      const credits = input.credits * parseFloat(user?.leadCost);
      if (user?.isDeleted) {
        return res.status(400).json({
          error: {
            message: "User deleted",
          },
        });
      } else if (!user?.buyerId) {
        return res.status(400).json({
          error: {
            message: "User not regsitered on Lead-Byte",
          },
        });
      } else if (!user) {
        return res.status(404).json({
          error: {
            message: "User Not Found",
          },
        });
      } else {
        let amount: number;
        const params = {
          buyerId: user.buyerId,
          fixedAmount: 0,
        };
        let dataToSave: Partial<TransactionInterface> = {
          userId: user.id,
          leadCost: user?.leadCost,
          amount: Math.abs(credits),
          status: PAYMENT_STATUS.CAPTURED,
          title: credits <= 0 ? transactionTitle.MANUAL_DEDUCTION : transactionTitle.MANUAL_ADJUSTMENT ,
          paymentType: transactionTitle.MANUAL_ADJUSTMENT,
        };
        // if (user?.credits < credits) {
        amount = credits;
        (params.fixedAmount = amount)
        if(amount < 0){
          (dataToSave.isCredited = false);
          (dataToSave.isDebited = true);

        }else{

          (dataToSave.isCredited = true);
        }
        dataToSave.creditsLeft = user.credits + credits; //@hotfix can have many test cases(Copied logic from develop branch)
        addCreditsToBuyer(params).then(async (res) => {
          const transaction = await Transaction.create(dataToSave);
          const paramPdf: generatePDFParams = {
            ContactID: user?.xeroContactId,

            desc: transactionTitle.CREDITS_ADDED,
            amount: 0,
            freeCredits: credits,
            sessionId: credits <= 0 ? transactionTitle.MANUAL_DEDUCTION : transactionTitle.MANUAL_ADJUSTMENT,
            isManualAdjustment: true,
          };
          if (input?.generateInvoice) {
            generatePDF(paramPdf)
              .then(async (res: AxiosResponse<XeroResponseInterface>) => {
                const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                  userId: user?.id,
                  transactionId: transaction.id,
                  price: credits,
                  invoiceId: res.data?.Invoices[0].InvoiceID,
                };
                await Invoice.create(dataToSaveInInvoice);
                await Transaction.findByIdAndUpdate(transaction.id, {
                  invoiceId: res.data?.Invoices[0].InvoiceID,
                });

              logger.info(
                "pdf generated",
                { res }
              );
              })
              .catch(async (err) => {
                refreshToken().then(async (res) => {
                  const paramPdf: generatePDFParams = {
                    ContactID: user?.xeroContactId,

                    desc: transactionTitle.CREDITS_ADDED,
                    amount: 0,
                    freeCredits: credits,
                    sessionId: transactionTitle.MANUAL_ADJUSTMENT,
                    isManualAdjustment: true,
                  };
                  generatePDF(paramPdf).then(async (res: AxiosResponse<XeroResponseInterface>) => {
                    const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                      userId: user?.id,
                      transactionId: transaction.id,
                      price: credits,
                      invoiceId: res.data?.Invoices[0].InvoiceID,
                    };
                    await Invoice.create(dataToSaveInInvoice);
                    await Transaction.findByIdAndUpdate(transaction.id, {
                      invoiceId: res.data?.Invoices[0].InvoiceID,
                    });

                  logger.info(
                    "pdf generated",
                    { res }
                  );
                  });
                });
              });
          }

          const userBusiness: BusinessDetailsInterface | null =
            isBusinessObject(user?.businessDetailsId)
              ? user?.businessDetailsId
              : null;

          const userLead =
            (await UserLeadsDetails.findById(user?.userLeadsDetailsId)) ??
            ({} as UserLeadsDetailsInterface);
          let paramsToSend: PostcodeWebhookParams = {
            userId: user._id,
            buyerId: user.buyerId,
            businessName: userBusiness?.businessName,
            businessIndustry: userBusiness?.businessIndustry,
            eventCode: EVENT_TITLE.ADD_CREDITS,
            topUpAmount: credits,
            weeklyCap: userLead?.daily * userLead.leadSchedule.length,
            dailyCap: userLead?.daily + calculateVariance(userLead?.daily),
            computedCap: calculateVariance(userLead?.daily),
          };
          if (userLead.type === POSTCODE_TYPE.RADIUS) {
            (paramsToSend.type = POSTCODE_TYPE.RADIUS),
              (paramsToSend.postcode = userLead.postCodeList);
          } else {
            paramsToSend.postCodeList = flattenPostalCodes(
              userLead?.postCodeTargettingList
            );
          }
          await eventsWebhook(paramsToSend)
            .then(() =>
              logger.info(
                "event webhook for add credits hits successfully.",
                { paramsToSend }
              )
            )
            .catch((err) =>
              logger.error(
                "error while triggering webhooks for add credits failed",
                err
              )
            );
        });

        return res.json({
          data: { message: "Credits Adjusted" },
        });
      }
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };
