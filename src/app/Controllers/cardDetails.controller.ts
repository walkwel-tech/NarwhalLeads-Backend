import { validate } from "class-validator";
import { Request, Response } from "express";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import {
  addUserXeroId,
  refreshToken,
} from "../../utils/XeroApiIntegration/createContact";
import { generatePDF } from "../../utils/XeroApiIntegration/generatePDF";
import {
  managePayments,
  managePaymentsByPaymentMethods,
} from "../../utils/payment";
import { UpdateCardInput } from "../Inputs/UpdateCard.input";
import {
  send_email_for_new_registration,
  send_email_for_registration,
} from "../Middlewares/mail";
import { AdminSettings } from "../Models/AdminSettings";
import { CardDetails } from "../Models/CardDetails";
import { Invoice } from "../Models/Invoice";
import { Transaction } from "../Models/Transaction";
import { User } from "../Models/User";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
// import { BusinessDetails } from "../Models/BusinessDetails";
// import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import { UserInterface } from "../../types/UserInterface";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { checkOnbOardingComplete } from "../../utils/Functions/Onboarding_complete";
import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import { attemptToPaymentInitial, createSessionInitial } from "../../utils/payment/createPaymentToRYFT";
import { BusinessDetails } from "../Models/BusinessDetails";
import { RyftPaymentMethods } from "../Models/RyftPaymentMethods";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";

export class CardDetailsControllers {
  static create = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;

    if (!input.userId) {
      return res
        .status(400)
        .json({ error: { message: "User Id is required" } });
    }
    try {
      const fixAmount: any = await AdminSettings.findOne();
      if (input.amount == null) {
        input.amount = fixAmount.amount;
      }

      if (input.amount < fixAmount?.amount) {
        return res.status(500).json({
          error: {
            message: "Enter amount greater than " + fixAmount?.amount,
          },
        });
      }

      const { onBoarding }: any = await User.findById(input.userId);
      let object = onBoarding || [];
      let arr: any = [];
      let existLead = object.find(
        (item: any) => item.key === ONBOARDING_KEYS?.CARD_DETAILS
      );

      if (existLead) {
        existLead.pendingFields = arr;
        const existBusinessDetails = object.find(
          (item: any) => item.key === ONBOARDING_KEYS.BUSINESS_DETAILS
        );

        object = object.map((obj: any) =>
          obj.key === existLead.key
            ? (existLead = {
                key: ONBOARDING_KEYS.CARD_DETAILS,
                pendingFields: arr,
                dependencies: existBusinessDetails?.pendingFields,
              })
            : obj
        );
      } else {
        const existBusinessDetails = object.find(
          (item: any) => item.key === ONBOARDING_KEYS?.BUSINESS_DETAILS
        );

        const mock = {
          key: ONBOARDING_KEYS.CARD_DETAILS,
          pendingFields: arr,
          dependencies: existBusinessDetails?.pendingFields,
        };
        object.push(mock);
      }
      await User.findByIdAndUpdate(input.userId, { onBoarding: object });

      let dataToSave: any = {
        userId: input.userId,
        cardHolderName: input.cardHolderName,
        //to trim the space between card number, will replace first space in string to ""
        cardNumber: input.cardNumber,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        cvc: input.cvc,
        amount: input.amount,
        isDefault: input.isDefault,
      };
      const user: any = await User.findById(input.userId)
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId");
      const userData = await CardDetails.create(dataToSave);

      send_email_for_registration(user.email, user.firstName);
      let array: any = [];
      user?.businessDetailsId?.businessOpeningHours.forEach((i: any) => {
        if (i.day != "") {
          let obj: any = {};
          obj.day = i.day;
          obj.openTime = i.openTime;
          obj.closeTime = i.closeTime;
          array.push(obj);
        }
      });
      if (checkOnbOardingComplete(user) && !user.registrationMailSentToAdmin) {
        const leadData = await UserLeadsDetails.findOne({ userId: user?._id });
        const businessDeatilsData = await BusinessDetails.findById(
          user?.businessDetailsId
        );
     

        const message = {
          firstName: user?.firstName,
          lastName: user?.lastName,
          businessName: businessDeatilsData?.businessName,
          phone: businessDeatilsData?.businessSalesNumber,
          email: user?.email,
          industry: businessDeatilsData?.businessIndustry,
          address:
            businessDeatilsData?.address1 + " " + businessDeatilsData?.address2,
          city: businessDeatilsData?.businessCity,
          country: businessDeatilsData?.businessCountry,
          // openingHours: formattedOpeningHours,
          openingHours: businessDeatilsData?.businessOpeningHours,
          totalLeads: leadData?.total,
          monthlyLeads: leadData?.monthly,
          weeklyLeads: leadData?.weekly,
          dailyLeads: leadData?.daily,
          // leadsHours: formattedLeadSchedule,
          leadsHours: leadData?.leadSchedule,
          area: leadData?.postCodeTargettingList,
        };
        send_email_for_new_registration(message);
        await User.findByIdAndUpdate(user.id, {
          registrationMailSentToAdmin: true,
        });
      }

      res.send({
        data: {
          _id: userData.id,
          cardHolderName: userData.cardHolderName,
          cardNumber: userData.cardNumber,
          expiryMonth: userData.expiryMonth,
          expiryYear: userData.expiryYear,
          cvc: userData.cvc,
          userId: userData.userId,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static addCard = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    const user = Object(req.user).id;
    try {
      let dataToSave: any = {
        userId: user,
        cardHolderName: input.cardHolderName,
        //to trim the space between card number
        cardNumber: input.cardNumber,
        // cardNumber:input.cardNumber,

        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        cvc: input.cvc,
        isDefault: input.isDefault, //should be false
      };

      const userData = await CardDetails.create(dataToSave);
      return res.json({
        data: {
          _id: userData.id,
          cardHolderName: userData.cardHolderName,
          cardNumber: userData.cardNumber.replace(/ +/g, ""),
          expiryMonth: userData.expiryMonth,
          expiryYear: userData.expiryYear,
          cvc: userData.cvc,
          userId: user,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static toggleForCard = async (req: Request, res: Response): Promise<any> => {
    const userId = Object(req.user).id;
    const id = req.params.id;

    try {
      const user = await CardDetails.find({ userId: userId, isDeleted: false });
      if (user) {
        user.forEach(async (i) => {
          if (i.isDefault) {
            await CardDetails.findByIdAndUpdate(i.id, { isDefault: false });
          }
        });
      }
      const updated = await CardDetails.findByIdAndUpdate(id, {
        isDefault: true,
      });
      const data = await CardDetails.findById(updated?.id);
      return res.json({
        data: data,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static updateCardDetails = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const { id } = req.params;
    const input = req.body;
    const updateCardInput = new UpdateCardInput();

    // @ts-ignore
    delete input.password;
    const errors = await validate(updateCardInput);

    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      return res
        .status(400)
        .json({ error: { message: "VALIDATION_ERROR", info: { errorsInfo } } });
    }

    try {
      const card = await CardDetails.findOne({ id: input.id });

      if (!card) {
        return res
          .status(404)
          .json({ error: { message: "CardDetails does not exists." } });
      }

      const data = await CardDetails.findByIdAndUpdate(
        id,
        {
          cardNumber: input.cardNumber ? input.cardNumber : card.cardNumber,
          expiryMonth: input.expiryMonth ? input.expiryMonth : card.expiryMonth,
          expiryYear: input.expiryYear ? input.expiryYear : card.expiryYear,
          cvc: input.cvc ? input.cvc : card.cvc,
        },
        {
          new: true,
        }
      );
      if (data) {
        const updatedUser = await CardDetails.findById(id, "-password -__v");
        return res.json({
          data: {
            message: "CardDetails updated successfully.",
            data: updatedUser,
          },
        });
      } else {
        return res.json({
          data: { message: "Incorrect input fields" },
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static show = async (req: Request, res: Response): Promise<any> => {
    try {
      const cards = await CardDetails.find({ isDeleted: false });
      return res.json({ data: cards });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };

  static showById = async (req: Request, res: Response): Promise<any> => {
    const userId = req.params.id;
    try {
      const cards = await CardDetails.find({
        userId: userId,
        isDeleted: false,
      });
      return res.json({ data: cards });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const cardExist = await CardDetails.findById(id);
    if (cardExist?.isDefault) {
      return res
        .status(400)
        .json({ error: { message: "Default card cannot be deleted!" } });
    }
    if (cardExist?.isDeleted) {
      return res
        .status(400)
        .json({ error: { message: "Card has been already deleted." } });
    }

    try {
      const card = await CardDetails.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
      });

      if (!card) {
        return res
          .status(400)
          .json({ error: { message: "card to delete does not exists." } });
      }

      return res.json({ message: "Card deleted successfully." });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static addCreditsManually = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    //@ts-ignore
    const userId = req.user?.id;
    const input = req.body;
    const promoLink: any = await FreeCreditsLink.findOne({
      user: { $elemMatch: { userId: userId } },
    });
    let user: UserInterface | null = await User.findById(userId);

    try {
      if (!user) {
        return res
          .status(404)
          .json({ error: { message: "User does not exist" } });
      }

      if (user && (!user.isRyftCustomer || !user.isLeadbyteCustomer)) {
        return res.status(403).json({
          error: {
            message:
              "Please complete business details and card details to top up",
          },
        });
      }

      if (!user?.xeroContactId) {
        try {
          user = await addUserXeroId(userId);
        } catch (error) {
          console.log("error");
        }
      }

      if (
        user?.paymentMethod != paymentMethodEnum.MANUALLY_ADD_CREDITS_METHOD
      ) {
        return res.status(400).json({
          error: { message: "please select manual top-up payment method" },
        });
      }
      const card = await CardDetails.findOne({
        userId: userId,
        isDefault: true,
      });
      if (!card) {
        return res
          .status(400)
          .json({ error: { message: "Card Details not found" } });
      }
      const adminSettings: any = await AdminSettings.findOne();
      if (input.amount < adminSettings?.minimumUserTopUpAmount) {
        return res.status(500).json({
          error: {
            message:
              "Enter amount greater than " +
              adminSettings?.minimumUserTopUpAmount,
          },
        });
      }
      const params: any = {
        fixedAmount: input?.amount || adminSettings?.minimumUserTopUpAmount,
        email: user?.email,
        cardNumber: card?.cardNumber,
        expiryMonth: card?.expiryMonth,
        expiryYear: card?.expiryYear,
        cvc: card?.cvc,
        buyerId: user?.buyerId,
        freeCredits: 0,
        clientId: user?.ryftClientId,
        cardId: card.id,
      };
      let amount: number;
      if (input.amount) {
        amount = input.amount;
      } else {
        amount = adminSettings?.minimumUserTopUpAmount;
      }
      if (input.amount >= promoLink?.topUpAmount) {
        params.freeCredits = promoLink.freeCredits;
      }
      const paymentMethodsExists = await RyftPaymentMethods.findOne({
        cardId: card.id,
      });

      if (!paymentMethodsExists) {
        managePayments(params)
          .then(async (_res) => {
            console.log("payment success!! ");
            const transactionData: any = {
              userId: userId,
              cardId: card.id,
              isCredited: true,
              title: transactionTitle.CREDITS_ADDED,
              status: "success",
              amount: input.amount || adminSettings?.minimumUserTopUpAmount,
              creditsLeft:
                user?.credits +
                (input.amount || adminSettings?.minimumUserTopUpAmount),
            };
            const transaction = await Transaction.create(transactionData);
            if (!user?.xeroContactId) {
              console.log("xeroContact ID not found. Failed to generate pdf.");
            } else {
              generatePDF(
                user?.xeroContactId,
                transactionTitle.CREDITS_ADDED,
                amount
              )
                .then(async (_res: any) => {
                  const dataToSaveInInvoice: any = {
                    userId: userId,
                    transactionId: transaction.id,
                    price: amount,
                    invoiceId: _res.data.Invoices[0].InvoiceID,
                  };
                  await Invoice.create(dataToSaveInInvoice);
                  await Transaction.findByIdAndUpdate(transaction.id, {
                    invoiceId: _res.data.Invoices[0].InvoiceID,
                  });
                  console.log("PDF generated");
                })
                .catch(async (error) => {
                  refreshToken().then(async (_res) => {
                    generatePDF(
                      //@ts-ignore
                      user?.xeroContactId,
                      transactionTitle.CREDITS_ADDED,
                      amount
                    ).then(async (_res: any) => {
                      const dataToSaveInInvoice: any = {
                        userId: userId,
                        transactionId: transaction.id,
                        price: amount,
                        invoiceId: _res.data.Invoices[0].InvoiceID,
                      };
                      await Invoice.create(dataToSaveInInvoice);
                      await Transaction.findByIdAndUpdate(transaction.id, {
                        invoiceId: _res.data.Invoices[0].InvoiceID,
                      });
                      console.log("PDF generated");
                    });
                  });
                });
            }
          })
          .catch(async (err) => {
            console.log("error in payment Api", err);
            const transactionData: any = {
              userId: userId,
              cardId: card.id,
              isCredited: true,
              title: transactionTitle.CREDITS_ADDED,
              status: "error",
              amount: input.amount || adminSettings?.minimumUserTopUpAmount,
              creditsLeft: user?.credits,
            };
            await Transaction.create(transactionData);
          });
      } else {
        params.paymentId =
          //@ts-ignore
          paymentMethodsExists?.paymentMethod?.tokenizedDetails?.id;
        console.log(params);
        managePaymentsByPaymentMethods(params)
          .then(async (_res) => {
            console.log("payment success!!");
            const transactionData: any = {
              userId: userId,
              cardId: card.id,
              isCredited: true,
              title: transactionTitle.CREDITS_ADDED,
              status: "success",
              amount: input.amount || adminSettings?.minimumUserTopUpAmount,
              creditsLeft:
                user?.credits +
                (input.amount || adminSettings?.minimumUserTopUpAmount),
            };
            console.log(transactionData);
            const transaction = await Transaction.create(transactionData);
            if (!user?.xeroContactId) {
              console.log("xeroContact ID not found. Failed to generate pdf.");
            } else {
              generatePDF(
                user?.xeroContactId,
                transactionTitle.CREDITS_ADDED,
                amount
              )
                .then(async (_res: any) => {
                  const dataToSaveInInvoice: any = {
                    userId: userId,
                    transactionId: transaction.id,
                    price: amount,
                    invoiceId: _res.data.Invoices[0].InvoiceID,
                  };
                  await Invoice.create(dataToSaveInInvoice);
                  await Transaction.findByIdAndUpdate(transaction.id, {
                    invoiceId: _res.data.Invoices[0].InvoiceID,
                  });

                  console.log("PDF generated");
                })
                .catch(async (error) => {
                  refreshToken().then(async (_res) => {
                    generatePDF(
                      //@ts-ignore
                      user?.xeroContactId,
                      transactionTitle.CREDITS_ADDED,
                      amount
                    ).then(async (_res: any) => {
                      const dataToSaveInInvoice: any = {
                        userId: userId,
                        transactionId: transaction.id,
                        price: amount,
                        invoiceId: _res.data.Invoices[0].InvoiceID,
                      };
                      await Invoice.create(dataToSaveInInvoice);
                      await Transaction.findByIdAndUpdate(transaction.id, {
                        invoiceId: _res.data.Invoices[0].InvoiceID,
                      });

                      console.log("PDF generated");
                    });
                  });
                });
            }
          })
          .catch(async (err) => {
            console.log("error in payment Api", err);
            const transactionData: any = {
              userId: userId,
              cardId: card.id,
              isCredited: true,
              title: transactionTitle.CREDITS_ADDED,
              status: "error",
              amount: input.amount || adminSettings?.minimumUserTopUpAmount,
              creditsLeft: user?.credits,
            };
            await Transaction.create(transactionData);
          });
      }

      async function response() {
        const result = await User.findById(userId, "-password -__v");
        if (result?.credits === user?.credits) {
          return res.status(400).json({
            error: {
              message:
                "Error occur in your payment. Please try again after some time",
            },
          });
        } else {
          return res.json({ data: result });
        }
      }
      setTimeout(response, 10000);
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static createSessionRyft = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;
    let sessionObject:any={}

    createSessionInitial(input).then((response: any) => {
      sessionObject.clientSecret=response.data.clientSecret,
      sessionObject.publicKey=process.env.RYFT_PUBLIC_KEY
      sessionObject.status=response.data.status
      return res.json({ data: sessionObject })
      }).catch((error)=>{
        return res.status(400).json({data:{message:"Error in creating session"}});
    });
  };
  static attemptPaymentRyft = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;
    attemptToPaymentInitial(input).then((response: any) => {
      return res.json({ data: response })
      }).catch((error)=>{
        return res.status(400).json({data:{message:"Card not verified"}});
    });
  };


  static handlepaymentStatus = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;
    console.log(input)
  };
}
