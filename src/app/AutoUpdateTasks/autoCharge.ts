
// import { deliveryEnums } from "../../utils/Enums/delivery.enum";
import moment from "moment-timezone";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import {
  managePayments,
  managePaymentsByPaymentMethods,
  managePaymentsForWeeklyPayment,
} from "../../utils/payment";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { generatePDF } from "../../utils/XeroApiIntegration/generatePDF";
import {
  send_email_for_autocharge,
  send_email_for_failed_autocharge,
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
import { RyftPaymentMethods } from "../Models/RyftPaymentMethods";

const cron = require("node-cron");
export const autoChargePayment = async () => {
  cron.schedule("0 0 */23 * * *", async () => {
  // cron.schedule("* * * * *", async () => {
    console.log("running a task after 23 Hours");

    const fixedAmount: any = await AdminSettings.findOne();
    const value = fixedAmount.amount / fixedAmount.thresholdValue;
    const data = await User.find({
      credits: { $lt: value },
      // autoCharge: true,
      paymentMethod: paymentMethodEnum.AUTOCHARGE_METHOD,
    }).populate("businessDetailsId")
    .populate("userLeadsDetailsId");
    if (data?.length > 0) {
      data.map(async (i) => {
        const card: any = await CardDetails.findOne({
          userId: i.id,
          isDefault: true,
          isDeleted: false,
        });
        const params: any = {
          fixedAmount: i?.autoChargeAmount,
          email: i.email,
          cardNumber: card?.cardNumber,
          expiryMonth: card?.expiryMonth,
          expiryYear: card?.expiryYear,
          cvc: card?.cvc,
          buyerId: i.buyerId,
          clientId:i?.ryftClientId,
          cardId:card.id


        };
        const text = {
          firstName: i.firstName,
          lastName:i.lastName,
          //@ts-ignore
          businessName:i.businessDetailsId?.businessName,
              //@ts-ignore
          phone:i.businessDetailsId?.businessSalesNumber,
          email:i.email,
          credits:i.credits,
          amount: i?.autoChargeAmount,
          cardNumberEnd: card?.cardNumber?.substr(-4),
          cardHolderName:card?.cardHolderName,
        };
        send_email_for_autocharge(i.email, text);
        const paymentMethodsExists=await RyftPaymentMethods.findOne({cardId:card.id,userId:i.id})
        if(!paymentMethodsExists){
        
           managePayments(params)
          .then(async (res) => {
            if (!i.xeroContactId) {
              console.log("xeroContact ID not found. Failed to generate pdf.");
            }
            const dataToSave: any = {
              userId: i.id,
              cardId: card?.id,
              amount: i?.autoChargeAmount,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "success",
            };
            const transaction = await Transaction.create(dataToSave);
            if (i.xeroContactId) {
              generatePDF(
                i?.xeroContactId,
                transactionTitle.CREDITS_ADDED,
                i?.autoChargeAmount
              )
                .then(async (res:any) => {
                  const dataToSaveInInvoice: any = {
                    userId: i.id,
                    transactionId: transaction.id,
                    price: i?.autoChargeAmount,
                    invoiceId: res.data.Invoices[0].InvoiceID,
                  };
                  await Invoice.create(dataToSaveInInvoice);
                  console.log("payment success!!!!!!!!!!!!!");
                })
                .catch((error) => {
                  refreshToken().then(async (res) => {
                    generatePDF(
                      i?.xeroContactId,
                      transactionTitle.CREDITS_ADDED,
                      i?.autoChargeAmount
                    ).then(async (res:any) => {
                      const dataToSaveInInvoice: any = {
                        userId: i.id,
                        transactionId: transaction.id,
                        price:i?.autoChargeAmount,
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      };
                      await Invoice.create(dataToSaveInInvoice);
                      console.log("payment success!!!!!!!!!!!!!");
                    });
                  });
                });
            }
          })
          .catch(async (err) => {
            send_email_for_failed_autocharge(i.email, text);
            console.log("error in payment Api");
            const dataToSave: any = {
              userId: i.id,
              cardId: card?.id,
              amount: i?.autoChargeAmount,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "error",
            };
            await Transaction.create(dataToSave);
          });
        }
        else{
         
          //@ts-ignore
          params.paymentId=paymentMethodsExists?.paymentMethod?.tokenizedDetails?.id
          managePaymentsByPaymentMethods(params)
          .then(async (res) => {
            if (!i.xeroContactId) {
              console.log("xeroContact ID not found. Failed to generate pdf.");
            }
            const dataToSave: any = {
              userId: i.id,
              cardId: card?.id,
              amount: i?.autoChargeAmount,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "success",
            };
            const transaction = await Transaction.create(dataToSave);
            if (i.xeroContactId) {
              generatePDF(
                i?.xeroContactId,
                transactionTitle.CREDITS_ADDED,
                i?.autoChargeAmount
              )
                .then(async (res:any) => {
                  const dataToSaveInInvoice: any = {
                    userId: i.id,
                    transactionId: transaction.id,
                    price: i?.autoChargeAmount,
                    invoiceId: res.data.Invoices[0].InvoiceID,
                  };
                  await Invoice.create(dataToSaveInInvoice);
                  console.log("payment success!!!!!!!!!!!!!");
                })
                .catch((error) => {
                  refreshToken().then(async (res) => {
                    generatePDF(
                      i?.xeroContactId,
                      transactionTitle.CREDITS_ADDED,
                      i?.autoChargeAmount
                    ).then(async (res:any) => {
                      const dataToSaveInInvoice: any = {
                        userId: i.id,
                        transactionId: transaction.id,
                        price:i?.autoChargeAmount,
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      };
                      await Invoice.create(dataToSaveInInvoice);
                      console.log("payment success!!!!!!!!!!!!!");
                    });
                  });
                });
            }
          })
          .catch(async (err) => {
            send_email_for_failed_autocharge(i.email, text);
            console.log("error in payment Api");
            const dataToSave: any = {
              userId: i.id,
              cardId: card?.id,
              amount: i?.autoChargeAmount,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "error",
            };
            await Transaction.create(dataToSave);
          });
        }
        console.log("--->>>",params)
       
      });
    } else {
      console.log("no data found to autocharge");
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
        if(i.isLeadCostCheck){
          leadcpl=i.leadCost
        }
        else{
          const industry= await BuisnessIndustries.findById(i.businessIndustryId)
          leadcpl=industry?.leadCost
        }
          //@ts-ignore
          const amountToCharge = leadcpl * leads.length;
           //@ts-ignore
          const addCredits = leadsDetails?.weekly * leadcpl;
          const params: any = {
            fixedAmount: amountToCharge,
            email: i.email,
            cardNumber: card?.cardNumber,
            expiryMonth: card?.expiryMonth,
            expiryYear: card?.expiryYear,
            cvc: card?.cvc,
            buyerId: i.buyerId,
            addCredits: addCredits,
            clientId:i?.ryftClientId,
            cardId:card?.id
          };
          managePaymentsForWeeklyPayment(params)
            .then(async (res) => {
              const dataToSaveDeduction: any = {
                userId: i.id,
                cardId: card?.id,
                amount: amountToCharge,
                title: transactionTitle.NEW_LEAD,
                status:"success",
                isDebited: true,
              };
              await Transaction.create(
                dataToSaveDeduction
              );  
              const addCreditsParams: any = {
                buyerId: i.buyerId,
                fixedAmount: addCredits,
                freeCredits:0
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
                    addCredits
                  ).then(async (res:any) => {                      
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
                          addCredits
                        ).then(async (res:any) => {                      
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
                })
              console.log("payment success!!!!!!!!!!!!!");
            })
            .catch(async (err) => {
              console.log("error in payment Api",err);
            });
        }
      });
    }
  });
};
