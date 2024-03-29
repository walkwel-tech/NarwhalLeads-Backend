import {AxiosResponse} from "axios";
import fs from "fs"
import moment from "moment-timezone";
import {Types} from "mongoose";
import * as cron from "node-cron";
import {CardDetailsInterface} from "../../types/CardDetailsInterface";
import {InvoiceInterface} from "../../types/InvoiceInterface";
import {TransactionInterface} from "../../types/TransactionInterface";
import {UserInterface} from "../../types/UserInterface";
import {XeroResponseInterface} from "../../types/XeroResponseInterface";
import {CURRENCY_SIGN} from "../../utils/constantFiles/email.templateIDs";
import {VAT} from "../../utils/constantFiles/Invoices";
import {AUTO_UPDATED_TASKS} from "../../utils/Enums/autoUpdatedTasks.enum";
import {CARD} from "../../utils/Enums/cardType.enum";
import {CURRENCY} from "../../utils/Enums/currency.enum";
import {paymentMethodEnum} from "../../utils/Enums/payment.method.enum";
import {PAYMENT_STATUS} from "../../utils/Enums/payment.status";
import {PAYMENT_TYPE_ENUM} from "../../utils/Enums/paymentType.enum";
import {APP_ENV} from "../../utils/Enums/serverModes.enum";
import {transactionTitle} from "../../utils/Enums/transaction.title.enum";
import {addCreditsToBuyer} from "../../utils/payment/addBuyerCredit";
import {createSessionUnScheduledPayment} from "../../utils/payment/createPaymentToRYFT";
import {createPaymentOnStripe} from "../../utils/payment/stripe/createPaymentToStripe";
import {IntentInterface} from "../../utils/payment/stripe/paymentIntent";
import logger from "../../utils/winstonLogger/logger";
import {refreshToken} from "../../utils/XeroApiIntegration/createContact";

import {generatePDF, generatePDFParams,} from "../../utils/XeroApiIntegration/generatePDF";
import {getOriginalAmountForStripe} from "../Controllers/cardDetails.controller";
import {sendEmailForRequireActionAutocharge} from "../Middlewares/mail";
import {AdminSettings} from "../Models/AdminSettings";
import {AutoUpdatedTasksLogs} from "../Models/AutoChargeLogs";
import {BuisnessIndustries} from "../Models/BuisnessIndustries";
import {BusinessDetails} from "../Models/BusinessDetails";
import {CardDetails} from "../Models/CardDetails";
import {Invoice} from "../Models/Invoice";
import {Leads} from "../Models/Leads";
import {Transaction} from "../Models/Transaction";
import {User} from "../Models/User";
import {UserLeadsDetails} from "../Models/UserLeadsDetails";

// import { paymentFailedWebhook } from "../../utils/webhookUrls/paymentFailedWebhook";

interface paymentParams {
  fixedAmount: number;
  email: string;
  cardNumber: string;
  buyerId: string;
  clientId: string;
  cardId: string;
  paymentSessionId: string;
  paymentMethodId?: string;
}

interface addCreditsParams {
  buyerId: string;
  fixedAmount: number;
  freeCredits: number;
}

export const autoChargePayment = async () => {
  const cronExpression: string = (process.env.APP_ENV !== APP_ENV.STAGING)
    ? "0 0/12 * * *" // Every 12 hours
    : "*/30 * * * *"; // Every 30 minutes

  cron.schedule(cronExpression, async () => {
    logger.info("AutoCharge: CRON Start..");
    try {
      const usersToCharge = await getUsersWithAutoChargeEnabled();

      fs.writeFile(
        `./logs/autocharge/autochargeuser-${new Date().getTime()}.json`,
        JSON.stringify(usersToCharge.map(u => ({
          id: u.id,
          buyerId: u.buyerId,
          credits: u.credits,
        }))),
        (err) => {
        if (err) {
          logger.error("Error writing file:", err);
        } else {
          logger.info("JSON data has been saved");
        }
      });

      Promise.all(
        usersToCharge.map(async (user) => {

          return new Promise(async (resolve, reject) => {
            logger.info(`Charging User: ${user.email}`);
            const dataToSave = {
              userId: user.id,
              title: AUTO_UPDATED_TASKS.AUTO_CHARGE,
            };
            let logs = await AutoUpdatedTasksLogs.create(dataToSave);
            const paymentMethod = await getUserPaymentMethods(user.id);
            if (paymentMethod) {
              await AutoUpdatedTasksLogs.findByIdAndUpdate(logs.id, {
                statusCode: 200,
              });
              await topUpUserForPaymentMethod(user, paymentMethod);
              resolve("success");
            } else {
              logger.error(`Payment method not found for user ${user.email}`);
              await AutoUpdatedTasksLogs.findByIdAndUpdate(logs.id, {
                notes: "payment method not found",
                statusCode: 400,
              });
              reject("payment method not found");
            }
          });
        })
      ).then((res) => {
        logger.info(`AutoCharge: CRON Ended Successfully charged ${res.length} users`);
      }).catch((err) => {
        logger.info(`AutoCharge: CRON Ended with Errors charged ${err.length} users`);
      }).finally(() => {
        logger.info("AutoCharge: CRON Ended finally");
      });
    } catch (error) {
      logger.error("Error in CRON job:", error);
    }
  });
};

export const weeklyPayment = async () => {
  cron.schedule("00 09 * * MON", async () => {
    logger.info("Monday 9am Cron Job started.");
    // cron.schedule("* * * * *",  async() => {

    const user = await User.find({
      paymentMethod: paymentMethodEnum.WEEKLY_PAYMENT_METHOD,
      isDeleted: false,
    });
    let leadcpl: number;
    if (!user || user?.length == 0) {
      logger.info("no user found to make payment");
    } else {
      user.map(async (user) => {
        return new Promise(async (resolve, reject) => {
          try {
            const card = await CardDetails.findOne({
              userId: user?.id,
              isDefault: true,
              isDeleted: false,
            });

            const leads = await Leads.find({
              bid: user.buyerId,
              createdAt: {
                // $gte: moment().subtract(7, "days").toDate(),
                $gte: moment()
                  .hours(9)
                  .minutes(0)
                  .seconds(0)
                  .subtract(7, "days")
                  .toString(),
              },
            });
            if (leads.length == 0) {
              logger.info("no leads found in past week to make payment");
            } else {
              const leadsDetails = await UserLeadsDetails.findOne({
                userId: user.id,
              });
              await AdminSettings.findOne();
              if (user.isLeadCostCheck) {
                leadcpl = parseInt(user.leadCost);
              } else {
                const industry = await BuisnessIndustries.findById(
                  user.businessIndustryId
                );
                if (industry) {
                  leadcpl = industry?.leadCost;
                }
              }
              const amountToCharge = leadcpl * leads.length;
              const addCredits = (leadsDetails?.weekly || 0) * leadcpl;
              const params: paymentParams = {
                fixedAmount: amountToCharge,
                email: user.email,
                cardNumber: card?.cardNumber || "",
                buyerId: user.buyerId,
                clientId: user?.ryftClientId,
                cardId: card?.id,
                paymentSessionId: card?.paymentSessionID || "",
              };
              createSessionUnScheduledPayment(params)
                .then(async (_res_: any) => {
                  const dataToSaveDeduction: Partial<TransactionInterface> = {
                    userId: user.id,
                    leadCost: user?.leadCost,
                    cardId: card?.id,
                    amount: amountToCharge,
                    title: transactionTitle.NEW_LEAD,
                    status: PAYMENT_STATUS.CAPTURED,
                    isDebited: true,
                  };
                  await Transaction.create(dataToSaveDeduction);
                  const addCreditsParams: addCreditsParams = {
                    buyerId: user.buyerId,
                    fixedAmount: addCredits,
                    freeCredits: 0,
                  };
                  addCreditsToBuyer(addCreditsParams)
                    .then(async (res) => {
                      const dataToSave: Partial<TransactionInterface> = {
                        userId: user.id,
                        leadCost: user?.leadCost,
                        cardId: card?.id,
                        amount: addCredits,
                        title: transactionTitle.CREDITS_ADDED,
                        isCredited: true,
                        status: PAYMENT_STATUS.CAPTURED,
                      };
                      const transaction = await Transaction.create(dataToSave);
                      const leftCredits = user.credits - amountToCharge;
                      await User.findByIdAndUpdate(user.id, {
                        credits: leftCredits,
                      });
                      const paramPdf: generatePDFParams = {
                        ContactID: user.xeroContactId,
                        desc: transactionTitle.CREDITS_ADDED,
                        amount: addCredits,
                        freeCredits: 0,
                        sessionId: _res_.data?.id,
                        isManualAdjustment: false,
                      };
                      generatePDF(paramPdf)
                        .then(async (res: AxiosResponse<XeroResponseInterface>) => {
                          const dataToSaveInInvoice: Partial<InvoiceInterface> =
                            {
                              userId: user.id,
                              transactionId: transaction.id,
                              price: addCredits,
                              invoiceId: res?.data.Invoices[0].InvoiceID,
                            };
                          await Invoice.create(dataToSaveInInvoice);
                          logger.info("pdf generated", {res});
                        })
                        .catch((error) => {
                          refreshToken().then((res) => {
                            const paramPdf: generatePDFParams = {
                              ContactID: user.xeroContactId,
                              desc: transactionTitle.CREDITS_ADDED,
                              amount: addCredits,
                              freeCredits: 0,
                              sessionId: _res_.data?.id,
                              isManualAdjustment: false,
                            };
                            generatePDF(paramPdf).then(async (res: AxiosResponse<XeroResponseInterface>) => {
                              const dataToSaveInInvoice: Partial<InvoiceInterface> =
                                {
                                  userId: user.id,
                                  transactionId: transaction.id,
                                  price: addCredits,
                                  invoiceId: res.data.Invoices[0].InvoiceID,
                                };
                              await Invoice.create(dataToSaveInInvoice);
                              logger.info("pdf generated", {res});
                            });
                          });
                        });
                    })
                    .catch(async (err) => {
                      const dataToSave: Partial<TransactionInterface> = {
                        userId: user.id,
                        leadCost: user?.leadCost,
                        cardId: card?.id,
                        amount: addCredits,
                        title: transactionTitle.CREDITS_ADDED,
                        isCredited: true,
                        status: "error",
                      };
                      await Transaction.create(dataToSave);
                      logger.error("Error while adding credits", err);
                    });
                  logger.info("payment success!!!!!!!!!!!!!");
                })
                .catch(async (err) => {
                  logger.error("error in payment Api", err);
                });
            }
            resolve("weekly payment successfull");
          } catch {
            reject();
          }
        });
      });
    }
  });
};

export const getUsersWithAutoChargeEnabled = async (id?: Types.ObjectId) => {
  let dataToFind;


  if (!id) {
    dataToFind = {
      $expr: {
        $lt: ["$credits", "$triggerAmount"],
      },
      $or: [
        {pendingTransaction: ""},
        {pendingTransaction: {$exists: false}},

      ],
      paymentMethod: paymentMethodEnum.AUTOCHARGE_METHOD,
      isDeleted: false,
      isAutoChargeEnabled: true,
      buyerId: {$exists: true},
      isCreditsAndBillingEnabled: true,
      // implemented in future
      // retriedTransactionCount: { $lte: 1 },
    };
  } else {
    dataToFind = {
      _id: id,
      isDeleted: false,
      pendingTransaction: {$ne: null},
      retriedTransactionCount: {$lte: 1},
    };
  }

  const usersWithAutoChargeEnabled = await User.find(dataToFind).populate(
    "businessDetailsId"
  );
  return usersWithAutoChargeEnabled;
};

export const getUserPaymentMethods = async (id: string) => {
  const cards = await CardDetails.findOne({
    userId: id,
    isDeleted: false,
    isDefault: true,
  });
  return cards;
};

export const chargeUserOnStripe = async (params: IntentInterface) => {
  return new Promise((resolve, reject) => {
    createPaymentOnStripe(params, true)
      .then(async (_res: any) => {
        logger.info("payment initiated!", {
          stripeUser: params.customer,
        });

        if (_res.status === PAYMENT_STATUS.REQUIRES_ACTION) {


          const user: UserInterface =
            (await User.findOne({email: params.email})) ??
            ({} as UserInterface);
          const cards: CardDetailsInterface =
            (await CardDetails.findOne({
              userId: user.id,
              isDeleted: false,
              isDefault: true,
            })) ?? ({} as CardDetailsInterface);
          const dataToSave = {
            userId: user.id,
            leadCost: user?.leadCost,
            cardId: cards.id,
            amount: params.amount ? (params.amount / 100) : 0, //converting back to dollars from cents
            status: PAYMENT_STATUS.REQUIRES_ACTION,
            title: transactionTitle.CREDITS_ADDED,
            paymentSessionId: _res.id,
            paymentType: PAYMENT_TYPE_ENUM.AUTO_CHARGE,
            notes: _res.client_secret,
            transactionType: CARD.STRIPE,
          };
          await Transaction.create(dataToSave);
          const business = await BusinessDetails.findById(
            user.businessDetailsId
          );
          // updated user with 3ds pending transaction
          await User.findByIdAndUpdate(user._id, {
            pendingTransaction: _res.client_secret,
            // retriedTransactionCount: user.retriedTransactionCount++
          });
          let originalAmount = Math.ceil(
            getOriginalAmountForStripe(params?.amount || 0, user.currency)
          );

          let message = {
            firstName: user?.firstName,
            lastName: user?.lastName,
            //@ts-ignore
            businessName: business?.businessName,
            //@ts-ignore
            phone: user?.phoneNumber,
            email: user?.email,
            credit: `${user?.credits}`,
            paymentAmount: `${originalAmount}`,
            cardNumberEnd: cards?.cardNumber,
            cardHolderName: cards?.cardHolderName,
            currency: CURRENCY_SIGN.GBP,
            isIncVat: true,
          };
          if (user.currency === CURRENCY.DOLLER) {
            message.currency = CURRENCY_SIGN.USD;
          } else if (user.currency === CURRENCY.EURO) {
            message.currency = CURRENCY_SIGN.EUR;
            message.isIncVat = false;
          }
          // const content = "We have recently identified a payment which require 3DS action of user"
          // await paymentFailedWebhook(user, user.id, business?.businessName as string, content, business?.businessIndustry as string ).then((res) => {
          //   logger.info(res, "PAYMENT FAILED WEBHOOK RESPONSE", new Date())
          // }).catch((err) => {
          //   console.error(err, "PAYMENT FAILED WEBHOOK ERROR", new Date())
          // });

          sendEmailForRequireActionAutocharge(user.email, message);
        }
        resolve(_res);
      })
      .catch(async (err) => {
        logger.info(`error in payment Api ${new Date()}`, err);
        // FUTURE: FIX CRON JOB SCHEDULING and Instead use other methods
        const shouldRetryOtherMethods = false;
        if (shouldRetryOtherMethods) {
          const user: UserInterface =
            (await User.findOne({stripeClientId: params.clientId})) ??
            ({} as UserInterface);
          const cards: CardDetailsInterface[] =
            (await CardDetails.find({userId: user.id, isDeleted: false})) ??
            ([] as CardDetailsInterface[]);
          await handleFailedChargeOnStripe(user, cards);
        }


        reject(err);
      });
  });
};

export const handleFailedChargeOnStripe = async (
  user: UserInterface,
  card: CardDetailsInterface[]
) => {
  const task = cron.schedule("0 2 * * *", async () => {
    task.stop();
    const currentDate = new Date();

    const yesterday = new Date(currentDate);
    yesterday.setDate(currentDate.getDate() - 1);
    currentDate.setDate(currentDate.getDate() + 1);
    const twoHoursAgoDate = new Date(
      currentDate.getTime() - 2 * 60 * 60 * 1000
    );
    const transactions = await Transaction.find({
      createdAt: {
        $gte: twoHoursAgoDate,
        $lte: currentDate,
      },
      paymentType: PAYMENT_TYPE_ENUM.AUTO_CHARGE,
    });
    let cardsArray: CardDetailsInterface[] = [];
    card.map((card: any) => {
      cardsArray.push(card.paymentMethod);
    });

    let previousTransactions: TransactionInterface[] = [];
    transactions.map((txn: any) => {
      previousTransactions.push(txn.paymentMethod);
    });

    let leftCards = getElementsNotInSubset(cardsArray, previousTransactions);
    if (leftCards.length > 0) {
      const card: CardDetailsInterface =
        (await CardDetails.findOne({
          paymentMethod: leftCards[0],
          userId: user.id,
          isDeleted: false,
        })) ?? ({} as CardDetailsInterface);

      const amountToPay = (user.currency === CURRENCY.POUND || user.currency === CURRENCY.DOLLER)
        ? user?.autoChargeAmount
        : user?.autoChargeAmount + (user.autoChargeAmount * VAT) / 100;

      const params = {
        amount: amountToPay * 100,
        email: user?.email,
        cardNumber: card?.cardNumber,
        expiryMonth: card?.expiryMonth,
        expiryYear: card?.expiryYear,
        cvc: card?.cvc,
        buyerId: user?.buyerId,
        freeCredits: 0,
        customer: user?.stripeClientId,
        cardId: card.id,
        paymentMethod: card?.paymentMethod,
        currency: user.currency,
      };
      return await chargeUserOnStripe(params);
    } else {
      logger.info(`No Valid Cards email should be sent now to ${user.email}`);
      return false;
    }
  });
};

export const topUpUserForPaymentMethod = async (
  user: UserInterface,
  paymentMethod: CardDetailsInterface
) => {
  if (!user) {
    return false;
  }

  const amountToPay = (user.currency === CURRENCY.POUND || user.currency === CURRENCY.DOLLER)
    ? (user.autoChargeAmount + ((user.autoChargeAmount * VAT) / 100))
    : user.autoChargeAmount;

  let params = {
    amount: amountToPay * 100,
    email: user?.email,
    cardNumber: paymentMethod?.cardNumber,
    expiryMonth: paymentMethod?.expiryMonth,
    expiryYear: paymentMethod?.expiryYear,
    cvc: paymentMethod?.cvc,
    buyerId: user?.buyerId,
    freeCredits: 0,
    customer: user?.stripeClientId,
    cardId: paymentMethod.id,
    paymentMethod: paymentMethod?.paymentMethod,
    currency: user?.currency,
  };

  try {
    const success: any = await chargeUserOnStripe(params);
    return success;
  } catch (error) {
    logger.error("ERROR WHILE CHARGING USER ON STRIPE", error);
  }
};

function getElementsNotInSubset(X: any[], Y: any[]): any[] {
  return X.filter((item) => !Y.includes(item));
}
