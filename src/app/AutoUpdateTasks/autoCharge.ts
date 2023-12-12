import moment from "moment-timezone";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { generatePDF } from "../../utils/XeroApiIntegration/generatePDF";
import { sendEmailForAutocharge } from "../Middlewares/mail";
import { AdminSettings } from "../Models/AdminSettings";
import { CardDetails } from "../Models/CardDetails";
import { Invoice } from "../Models/Invoice";
import { Leads } from "../Models/Leads";
import { Transaction } from "../Models/Transaction";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import { refreshToken } from "../../utils/XeroApiIntegration/createContact";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { VAT } from "../../utils/constantFiles/Invoices";
import { createSessionUnScheduledPayment } from "../../utils/payment/createPaymentToRYFT";
import { UserInterface } from "../../types/UserInterface";
import { CardDetailsInterface } from "../../types/CardDetailsInterface";
import { PAYMENT_TYPE_ENUM } from "../../utils/Enums/paymentType.enum";
import * as cron from "node-cron";
import { TransactionInterface } from "../../types/TransactionInterface";
import { InvoiceInterface } from "../../types/InvoiceInterface";
import { PAYMENT_STATUS } from "../../utils/Enums/payment.status";
import { createPaymentOnStrip } from "../../utils/payment/stripe/createPaymentToStripe";
import { IntentInterface } from "../../utils/payment/stripe/paymentIntent";
import { Types } from "mongoose";
import { AUTO_UPDATED_TASKS } from "../../utils/Enums/autoUpdatedTasks.enum";
import { AutoUpdatedTasksLogs } from "../Models/AutoChargeLogs";

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

interface FindOptions {
  $expr?: Record<string, string[] | number[]>;
  paymentMethod?: string;
  isDeleted: boolean;
  isAutoChargeEnabled?: boolean;
  _id?: Types.ObjectId;
}
export const autoChargePayment = async () => {
  cron.schedule("0 */4 * * *", async () => {
    // cron.schedule("* * * * *", async () => {
    console.log("CRON Job Start", new Date());
    try {
      const usersToCharge = await getUsersWithAutoChargeEnabled();
      for (const user of usersToCharge) {
        console.log("Auto charge will work on :", user.email);
        const dataToSave = {
          userId: user.id,
          title: AUTO_UPDATED_TASKS.AUTO_CHARGE,
        };
        let logs = await AutoUpdatedTasksLogs.create(dataToSave);
        const paymentMethod = await getUserPaymentMethods(user.id);
        if (paymentMethod) {
          await AutoUpdatedTasksLogs.findByIdAndUpdate(
            logs._id,
            {
              statusCode: "200",
            },
            { new: true }
          );
          return autoTopUp(user, paymentMethod);
        } else {
          console.log("payment method not found");
          await AutoUpdatedTasksLogs.findByIdAndUpdate(logs._id, {
            notes: "payment method not found",
            statusCode: "400",
          });
        }
      }
    } catch (error) {
      console.error("Error in CRON job:", error.response);
    }
  });
};

export const weeklypayment = async () => {
  cron.schedule("00 09 * * MON", async () => {
    console.log("Monday 9am Cron Job started.");
    // cron.schedule("* * * * *",  async() => {

    const user = await User.find({
      paymentMethod: paymentMethodEnum.WEEKLY_PAYMENT_METHOD,
      isDeleted: false,
    });
    let leadcpl: number;
    if (!user || user?.length == 0) {
      console.log("no user found to make payment");
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
              console.log("no leads found in past week to make payment");
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
                      generatePDF(
                        user.xeroContactId,
                        transactionTitle.CREDITS_ADDED,
                        addCredits,
                        0,
                        _res_.data?.id,
                        false
                      )
                        .then(async (res: any) => {
                          const dataToSaveInInvoice: Partial<InvoiceInterface> =
                            {
                              userId: user.id,
                              transactionId: transaction.id,
                              price: addCredits,
                              invoiceId: res?.data.Invoices[0].InvoiceID,
                            };
                          await Invoice.create(dataToSaveInInvoice);
                          console.log("pdf generated");
                        })
                        .catch((error) => {
                          refreshToken().then((res) => {
                            generatePDF(
                              user.xeroContactId,
                              transactionTitle.CREDITS_ADDED,
                              addCredits,
                              0,
                              _res_.data?.id,
                              false
                            ).then(async (res: any) => {
                              const dataToSaveInInvoice: Partial<InvoiceInterface> =
                                {
                                  userId: user.id,
                                  transactionId: transaction.id,
                                  price: addCredits,
                                  invoiceId: res.data.Invoices[0].InvoiceID,
                                };
                              await Invoice.create(dataToSaveInInvoice);
                              console.log("pdf generated");
                            });
                          });
                        });
                    })
                    .catch(async (err) => {
                      const dataToSave: Partial<TransactionInterface> = {
                        userId: user.id,
                        cardId: card?.id,
                        amount: addCredits,
                        title: transactionTitle.CREDITS_ADDED,
                        isCredited: true,
                        status: "error",
                      };
                      await Transaction.create(dataToSave);
                      console.log("Error while adding credits");
                    });
                  console.log("payment success!!!!!!!!!!!!!");
                })
                .catch(async (err) => {
                  console.log("error in payment Api", err);
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
  let dataToFind: FindOptions;
  if (!id) {
    dataToFind = {
      $expr: {
        $lt: ["$credits", "$triggerAmount"],
      },
      paymentMethod: paymentMethodEnum.AUTOCHARGE_METHOD,
      isDeleted: false,
      isAutoChargeEnabled: true,
    };
  } else {
    dataToFind = { _id: id, isDeleted: false };
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

export const chargeUser = async (params: IntentInterface) => {
  return new Promise((resolve, reject) => {
    createPaymentOnStrip(params)
      .then(async (_res: any) => {
        console.log(
          "payment initiated!",
          new Date(),
          {
            stripeUser: params.customer,
          },
          _res
        );
        resolve(_res);
      })
      .catch(async (err) => {
        console.log("error in payment Api", err.response.data);
        const user: UserInterface =
          (await User.findOne({ stripeClientId: params.clientId })) ??
          ({} as UserInterface);
        const cards: CardDetailsInterface[] =
          (await CardDetails.find({ userId: user.id, isDeleted: false })) ??
          ([] as CardDetailsInterface[]);
        await handleFailedCharge(user, cards);
        reject(err);
      });
  });
};

export const handleFailedCharge = async (
  user: UserInterface,
  card: CardDetailsInterface[]
) => {
  cron.schedule("0 2 * * *", async () => {
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

    let TransactionArray: TransactionInterface[] = [];
    transactions.map((txn: any) => {
      TransactionArray.push(txn.paymentMethod);
    });
    let leftCards = getElementsNotInSubset(cardsArray, TransactionArray);
    if (leftCards.length > 0) {
      const card: CardDetailsInterface =
        (await CardDetails.findOne({
          paymentMethod: leftCards[0],
          userId: user.id,
          isDeleted: false,
        })) ?? ({} as CardDetailsInterface);
      const params = {
        amount:
          (user?.autoChargeAmount + (user?.autoChargeAmount * VAT) / 100) * 100,
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
      return await chargeUser(params);
    } else {
      console.log("email should be sent now");
      return false;
    }
  });
};

export const autoTopUp = async (
  user: UserInterface,
  paymentMethod: CardDetailsInterface
) => {
  const params = {
    amount:
      (user?.autoChargeAmount + (user?.autoChargeAmount * VAT) / 100) * 100,
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
  const success: any = await chargeUser(params);
  if (success) {
    const cardExist = await CardDetails.findOne({
      paymentMethod: success.payment_method,
      isDeleted: false,
    });
    const text = {
      firstName: user.firstName,
      lastName: user.lastName,
      //@ts-ignore
      businessName: user.businessDetailsId?.businessName,
      //@ts-ignore
      phone: user.businessDetailsId?.businessSalesNumber,
      email: user.email,
      credits: user.credits,
      amount: user?.autoChargeAmount,
      cardNumberEnd: cardExist?.cardNumber?.substr(-4),
      cardHolderName: cardExist?.cardHolderName,
    };
    sendEmailForAutocharge(user.email, text);
  } else {
  }
  return success;
};

function getElementsNotInSubset(X: any[], Y: any[]): any[] {
  return X.filter((item) => !Y.includes(item));
}
