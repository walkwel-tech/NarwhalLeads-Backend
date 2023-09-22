// import { deliveryEnums } from "../../utils/Enums/delivery.enum";
import moment from "moment-timezone";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { generatePDF } from "../../utils/XeroApiIntegration/generatePDF";
import {
  sendEmailForAutocharge,
  // sendEmailForFailedAutocharge,
} from "../Middlewares/mail";
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
// import { PAYMENT_STATUS } from "../../utils/Enums/payment.status";
import { PAYMENT_TYPE_ENUM } from "../../utils/Enums/paymentType.enum";
const cron = require("node-cron");

interface paymentParams {
  fixedAmount: number;
  email: string;
  cardNumber: string;
  buyerId: string;
  clientId: string;
  cardId: string;
  paymentSessionId: string;
  paymentMethodId: string;
}

export const autoChargePayment = async () => {
  cron.schedule("0 0 * * *", async () => {
    // cron.schedule("*/2 * * * *", async () => {
    try {
      const usersToCharge = await getUsersToCharge();
      console.log("here is", usersToCharge);
      for (const user of usersToCharge) {
        const paymentMethod = await getUserPaymentMethods(user.id);

        if (paymentMethod) {
         return autoTopUp(user,paymentMethod)
      
        } else {
          console.log("payment method not found");
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
    });
    let leadcpl;
    if (!user || user?.length == 0) {
      console.log("no user found to make payment");
    } else {
      user.map(async (i) => {
        const card = await CardDetails.findOne({
          userId: i?.id,
          isDefault: true,
        });

        const leads = await Leads.find({
          bid: i.buyerId,
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
          const leadsDetails = await UserLeadsDetails.findOne({ userId: i.id });
          await AdminSettings.findOne();
          if (i.isLeadCostCheck) {
            leadcpl = i.leadCost;
          } else {
            const industry = await BuisnessIndustries.findById(
              i.businessIndustryId
            );
            leadcpl = industry?.leadCost;
          }
          //@ts-ignore
          const amountToCharge = leadcpl * leads.length;
          //@ts-ignore
          const addCredits = leadsDetails?.weekly * leadcpl;
          const params: any = {
            fixedAmount: amountToCharge,
            email: i.email,
            cardNumber: card?.cardNumber,
            buyerId: i.buyerId,
            clientId: i?.ryftClientId,
            cardId: card?.id,
            paymentSessionId: card?.paymentSessionID,
          };
          createSessionUnScheduledPayment(params)
            .then(async (res) => {
              const dataToSaveDeduction: any = {
                userId: i.id,
                cardId: card?.id,
                amount: amountToCharge,
                title: transactionTitle.NEW_LEAD,
                status: "success",
                isDebited: true,
              };
              await Transaction.create(dataToSaveDeduction);
              const addCreditsParams: any = {
                buyerId: i.buyerId,
                fixedAmount: addCredits,
                freeCredits: 0,
              };
              addCreditsToBuyer(addCreditsParams)
                .then(async (res) => {
                  const dataToSave: any = {
                    userId: i.id,
                    cardId: card?.id,
                    amount: addCredits,
                    title: transactionTitle.CREDITS_ADDED,
                    isCredited: true,
                    status: "success",
                  };
                  const transaction = await Transaction.create(dataToSave);
                  const leftCredits = i.credits - amountToCharge;
                  await User.findByIdAndUpdate(i.id, { credits: leftCredits });
                  generatePDF(
                    i.xeroContactId,
                    transactionTitle.CREDITS_ADDED,
                    addCredits,0
                  )
                    .then(async (res: any) => {
                      const dataToSaveInInvoice: any = {
                        userId: i.id,
                        transactionId: transaction.id,
                        price: addCredits,
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      };
                      await Invoice.create(dataToSaveInInvoice);
                      console.log("PDF generated");
                    })
                    .catch((error) => {
                      refreshToken().then((res) => {
                        generatePDF(
                          i.xeroContactId,
                          transactionTitle.CREDITS_ADDED,
                          addCredits,0
                        ).then(async (res: any) => {
                          const dataToSaveInInvoice: any = {
                            userId: i.id,
                            transactionId: transaction.id,
                            price: addCredits,
                            invoiceId: res.data.Invoices[0].InvoiceID,
                          };
                          await Invoice.create(dataToSaveInInvoice);
                          console.log("PDF generated");
                        });
                      });
                    });
                })
                .catch(async (err) => {
                  const dataToSave: any = {
                    userId: i.id,
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
      });
    }
  });
};

const getUsersToCharge = async () => {
  const data = await User.find({
    $expr: {
      $lt: ["$credits", "$triggerAmount"]},
    paymentMethod: paymentMethodEnum.AUTOCHARGE_METHOD,
  }).populate("businessDetailsId");
  return data;
};

const getUserPaymentMethods = async (id: string) => {
  const cards = await CardDetails.findOne({
    userId: id,
    isDeleted: false,
    isDefault: true,
  });
  return cards;
};

const chargeUser = async (params: paymentParams) => {
  return new Promise((resolve, reject) => {
    createSessionUnScheduledPayment(params)
      .then(async(res: any) => {
        resolve(res);
      })
      .catch(async (err) => {
        const user: any = await User.findOne({ ryftClientId: params.clientId });
        const cards: any = await CardDetails.find({ userId: user.id });
        await handleFailedCharge(user, cards);
        reject(err);
      });
  });
};

const handleFailedCharge = async (
  user: UserInterface,
  card: CardDetailsInterface[]
) => {
  cron.schedule('0 2 * * *',async ()=>{
    console.log("----------**** handle failed charge running ******-------------")
  const currentDate = new Date();

  const yesterday = new Date(currentDate);
  yesterday.setDate(currentDate.getDate() - 1);
  currentDate.setDate(currentDate.getDate() + 1);
  const twoHoursAgoDate = new Date(currentDate.getTime() - (2 * 60 * 60 * 1000)); // 2 hours in milliseconds
//fixme: if cron job is of 1 day then user yesterday instead of two hours ago
  const transactions = await Transaction.find({
    createdAt: {
      $gte: twoHoursAgoDate,
      $lte: currentDate,
    },
    paymentType: PAYMENT_TYPE_ENUM.AUTO_CHARGE,
  });
  let cardsArray: any[] = [];
  card.map((i: any) => {
    cardsArray.push(i.paymentMethod);
  });

  let TransactionArray: any[] = [];
  transactions.map((i: any) => {
    TransactionArray.push(i.paymentMethod);
  });
  let leftCards = getElementsNotInSubset(cardsArray, TransactionArray);
  console.log("leftcards---------", leftCards);
  if (leftCards.length > 0) {
    const card: any = await CardDetails.findOne({
      paymentMethod: leftCards[0],
      userId: user.id,
    });
    const params = {
      fixedAmount: user.autoChargeAmount + (user.autoChargeAmount * VAT) / 100,
      email: user.email,
      cardNumber: card?.cardNumber,
      buyerId: user.buyerId,
      clientId: user.ryftClientId,
      cardId: card?.id,
      paymentSessionId: card.paymentSessionID,
      paymentMethodId: card.paymentMethod,
    };
   return await chargeUser(params);
  } else {
    // sendEmailForFailedAutocharge(user.email, text);
    console.log("EMAIL SHOULD BE SENT NOW");
    return false

  }
})
};

const autoTopUp = async (
  user: UserInterface,
  paymentMethod: CardDetailsInterface
) => {
  
  const params: paymentParams = {
    fixedAmount: user.autoChargeAmount + (user.autoChargeAmount * VAT) / 100,
    email: user.email,
    cardNumber: paymentMethod?.cardNumber,
    buyerId: user.buyerId,
    clientId: user.ryftClientId,
    cardId: paymentMethod?.id,
    paymentSessionId: paymentMethod?.paymentSessionID,
    paymentMethodId: paymentMethod?.paymentMethod,
  };
  const success: any = await chargeUser(params);

  if (success) {
    const cardExist = await CardDetails.findOne({
      paymentSessionID: success.data.previousPayment.id,
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
    console.log("text", text);
    sendEmailForAutocharge(user.email, text);
  } else {
  }
  return success
};

function getElementsNotInSubset(X: any[], Y: any[]): any[] {
  return X.filter((item) => !Y.includes(item));
}
