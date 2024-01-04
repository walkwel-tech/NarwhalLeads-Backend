import { validate } from "class-validator";
import { Request, Response } from "express";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import {
  addUserXeroId,
  refreshToken,
} from "../../utils/XeroApiIntegration/createContact";
import {
  generatePDF,
  generatePDFParams,
} from "../../utils/XeroApiIntegration/generatePDF";
import { UpdateCardInput } from "../Inputs/UpdateCard.input";
import {
  sendEmailForFullySignupToAdmin,
  sendEmailForNewRegistration,
  sendEmailForPaymentFailure,
  sendEmailForPaymentSuccess,
  sendEmailForRegistration,
} from "../Middlewares/mail";
import { AdminSettings } from "../Models/AdminSettings";
import { CardDetails } from "../Models/CardDetails";
import { Invoice } from "../Models/Invoice";
import { Transaction } from "../Models/Transaction";
import { User } from "../Models/User";
import { FreeCreditsLink } from "../Models/freeCreditsLink";

import { UserInterface } from "../../types/UserInterface";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { checkOnbOardingComplete } from "../../utils/Functions/OnboardingComplete";

import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { RolesEnum } from "../../types/RolesEnum";
import axios from "axios";
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../utils/constantFiles/OnBoarding.keys";
import {
  createSessionInitial,
  createSessionUnScheduledPayment,
  customerPaymentMethods,
  getPaymentMethodByPaymentSessionID,
} from "../../utils/payment/createPaymentToRYFT";
import { BusinessDetails } from "../Models/BusinessDetails";
import { RyftPaymentMethods } from "../Models/RyftPaymentMethods";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import {
  PAYMENT_SESSION,
  PAYMENT_STATUS,
} from "../../utils/Enums/payment.status";
import { PROMO_LINK } from "../../utils/Enums/promoLink.enum";
import { VAT } from "../../utils/constantFiles/Invoices";
import mongoose from "mongoose";
import { PaymentResponse } from "../../types/PaymentResponseInterface";
import { PREMIUM_PROMOLINK } from "../../utils/constantFiles/spotDif.offers.promoLink";
import { PAYMENT_TYPE_ENUM } from "../../utils/Enums/paymentType.enum";
import {
  fullySignupWithCredits,
  userData,
} from "../../utils/webhookUrls/fullySignupWithCredits";
import { TRANSACTION_STATUS } from "../../utils/Enums/transaction.status.enum";
import { AdminSettingsInterface } from "../../types/AdminSettingInterface";
import { CardDetailsInterface } from "../../types/CardDetailsInterface";
import { TransactionInterface } from "../../types/TransactionInterface";
import { RyftPaymentInterface } from "../../types/RyftPaymentInterface";
import { InvoiceInterface } from "../../types/InvoiceInterface";
import {
  BusinessDetailsInterface,
  isBusinessObjectAndIncludesBusinessHours,
} from "../../types/BusinessInterface";
import { webhhokParams, webhookResponse } from "../../types/webhook.interfaces";
import { CARD } from "../../utils/Enums/cardType.enum";
import { paymentIntent } from "../../utils/payment/stripe/paymentIntent";
import {
  getStripePaymentMethods,
  getUserDetailsByPaymentMethods,
} from "../../utils/payment/stripe/paymentMethods";
import { createPaymentOnStrip } from "../../utils/payment/stripe/createPaymentToStripe";
import { STRIPE_PAYMENT_STATUS } from "../../utils/Enums/stripe.payment.status.enum";
import { createCustomerOnStripe } from "../../utils/createCustomer/createOnStripe";
import { getPaymentStatus } from "../../utils/payment/stripe/retrievePaymentStatus";
import { AMOUNT } from "../../utils/constantFiles/stripeConstants";
import { cmsUpdateBuyerWebhook } from "../../utils/webhookUrls/cmsUpdateBuyerWebhook";
import {
  PostcodeWebhookParams,
  eventsWebhook,
} from "../../utils/webhookUrls/eventExpansionWebhook";

import { EVENT_TITLE } from "../../utils/constantFiles/events";
import {
  countryCurrency,
  stripeCurrency,
} from "../../utils/constantFiles/currencyConstants";
import { flattenPostalCodes } from "../../utils/Functions/flattenPostcodes";
import { UserLeadsDetailsInterface } from "../../types/LeadDetailsInterface";
import { POSTCODE_TYPE } from "../../utils/Enums/postcode.enum";
import { CURRENCY_SIGN } from "../../utils/constantFiles/email.templateIDs";
import { CURRENCY } from "../../utils/Enums/currency.enum";
const ObjectId = mongoose.Types.ObjectId;

export class CardDetailsControllers {
  //not in use
  static create = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;

    if (!input.userId) {
      return res
        .status(400)
        .json({ error: { message: "User Id is required" } });
    }
    try {
      const fixAmount: AdminSettingsInterface =
        (await AdminSettings.findOne()) ?? ({} as AdminSettingsInterface);
      if (input.amount == null) {
        input.amount = fixAmount.amount;
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
      let dataToSave: Partial<CardDetailsInterface> = {
        userId: input.userId,
        cardHolderName: input?.cardHolderName,
        //to trim the space between card number, will replace first space in string to ""
        cardNumber: input?.cardNumber,
        expiryMonth: input?.expiryMonth,
        expiryYear: input?.expiryYear,
        cvc: input?.cvc,
        amount: input?.amount,
        isDefault: input?.isDefault,
      };
      const user: UserInterface =
        (await User.findById(input.userId)
          .populate("businessDetailsId")
          .populate("userLeadsDetailsId")) ?? ({} as UserInterface);
      const userData = await CardDetails.create(dataToSave);

      sendEmailForRegistration(user.email, user.firstName);
      let array: any = [];
      const userBusiness: BusinessDetailsInterface | null =
        isBusinessObjectAndIncludesBusinessHours(user?.businessDetailsId)
          ? user?.businessDetailsId
          : null;

      user?.id
        ? userBusiness?.businessOpeningHours.forEach(
            (businessOpeningHours: any) => {
              if (businessOpeningHours.day != "") {
                let obj: any = {};
                obj.day = businessOpeningHours.day;
                obj.openTime = businessOpeningHours.openTime;
                obj.closeTime = businessOpeningHours.closeTime;
                array.push(obj);
              }
            }
          )
        : "";
      if (checkOnbOardingComplete(user) && !user.registrationMailSentToAdmin) {
        const leadData = await UserLeadsDetails.findOne({ userId: user?._id });
        const businessDeatilsData = await BusinessDetails.findById(
          user?.businessDetailsId
        );
        const formattedPostCodes = leadData?.postCodeTargettingList
          .map((item: any) => item.postalCode)
          .flat();

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
          businessLogo: businessDeatilsData?.businessLogo,
          openingHours: businessDeatilsData?.businessOpeningHours,
          totalLeads: leadData?.total,
          monthlyLeads: leadData?.monthly,
          weeklyLeads: leadData?.weekly,
          dailyLeads: leadData?.daily,
          leadApiUrl: `${process.env.LEAD_API_URL}/leads/${user?.buyerId}`,
          leadsHours: leadData?.leadSchedule,
          area: `${formattedPostCodes}`,
          leadCost: user?.leadCost,
        };
        let subscribers: string[] = [`${process.env.ADMIN_EMAIL}`];
        const data = await User.find({ role: RolesEnum.SUBSCRIBER });
        data.map((subscriber) => subscribers.push(subscriber.email));
        subscribers.map((subs) => {
          sendEmailForNewRegistration(subs, message);
        });
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
    const id = Object(req.user).id;
    try {
      const user: UserInterface =
        (await User.findById(id)) ?? ({} as UserInterface);
      await User.findByIdAndUpdate(user?.id, {
        onBoarding: [
          {
            key: ONBOARDING_KEYS.BUSINESS_DETAILS,
            pendingFields: [],
            dependencies: [],
          },
          {
            key: ONBOARDING_KEYS.LEAD_DETAILS,
            pendingFields: [],
            dependencies: [],
          },
          {
            key: ONBOARDING_KEYS.CARD_DETAILS,
            pendingFields: [],
            dependencies: [],
          },
        ],
        onBoardingPercentage: ONBOARDING_PERCENTAGE.CARD_DETAILS,
      });
      if (input?.isUserSignup) {
        await User.findByIdAndUpdate(id, { isUserSignup: true });
      }
      const paymentMethodFromRYFT: any =
        await getPaymentMethodByPaymentSessionID(input.paymentSessionID);
      if (input?.paymentMethod) {
        let dataToSaveIncard: Partial<CardDetailsInterface> = {
          userId: user.id,
          cardHolderName: user?.firstName + user?.lastName,
          paymentSessionID: input?.paymentSessionID,
          //to trim the space between card number
          cardNumber: input?.cardNumber,
          cvc: input?.cvc,
          isDefault: input?.isDefault,
          paymentMethod:
            input?.paymentMethod ||
            paymentMethodFromRYFT?.paymentMethod?.tokenizedDetails?.id,
          status: PAYMENT_SESSION.SUCCESS, //should be false
        };
        if (input?.cardNumber?.length > 4) {
          dataToSaveIncard.cardNumber = input?.cardNumber.substr(
            input?.cardNumber?.length - 4
          );
        }
        let userData: CardDetailsInterface;
        const cardExists = await CardDetails.find({
          userId: user?.id,
          isDeleted: false,
        });

        if (!cardExists) {
          dataToSaveIncard.isDefault = true;
        }
        let existingCardNumbers: Array<string> = [];
        cardExists.map((card) => {
          existingCardNumbers.push(card.cardNumber);
        });
        if (!existingCardNumbers.includes((input?.cardNumber).toString())) {
          userData = await CardDetails.create(dataToSaveIncard);
          let dataToSave = {
            userId: id,
            ryftClientId: user?.ryftClientId,
            paymentMethod: input?.paymentMethod,
            cardId: userData.id,
          };
          await RyftPaymentMethods.create(dataToSave);
        } else {
          return res
            .status(422)
            .json({ error: { message: "Card Already Exist" } });
        }
        return res.json({
          data: { data: userData, message: "Card added successfully!" },
        });
      } else {
        return res.json({
          data: {
            message:
              "Card Verified! Please wait few minutes, Card will be added shortly.",
          },
        });
      }
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
        user.forEach(async (user) => {
          if (user.isDefault) {
            await CardDetails.findByIdAndUpdate(user.id, { isDefault: false });
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
    if (cardExist?.isDefault && cardExist.status === PAYMENT_STATUS.CAPTURED) {
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

      return res.json({ error: { message: "Card deleted successfully." } });
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
    let curentUser: Partial<UserInterface> = req.user ?? ({} as UserInterface);

    const userId = curentUser?.id;
    const input = req.body;

    let user: UserInterface | null = await User.findById(userId);

    try {
      if (!user) {
        return res
          .status(404)
          .json({ error: { message: "User does not exist" } });
      }

      if (user && !user.isLeadbyteCustomer) {
        return res.status(403).json({
          error: {
            message: "You are not register on Lead Byte.",
          },
        });
      }

      if (!user?.xeroContactId) {
        try {
          user = await addUserXeroId(userId);
        } catch (error) {}
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
        status: PAYMENT_STATUS.CAPTURED,
        isDeleted: false,
      });
      if (!card) {
        return res
          .status(404)
          .json({ error: { message: "Card Details not found" } });
      }
      const adminSettings: AdminSettingsInterface =
        (await AdminSettings.findOne()) ?? ({} as AdminSettingsInterface);
      if (card.cardType === CARD.RYFT) {
        const params: any = {
          fixedAmount:
            parseInt(input?.amount) + (parseInt(input?.amount) * VAT) / 100 ||
            adminSettings?.minimumUserTopUpAmount,
          email: user?.email,
          cardNumber: card?.cardNumber,
          expiryMonth: card?.expiryMonth,
          expiryYear: card?.expiryYear,
          cvc: card?.cvc,
          buyerId: user?.buyerId,
          freeCredits: 0,
          clientId: user?.ryftClientId,
          cardId: card.id,
          paymentSessionId: card?.paymentSessionID,
        };

        const paymentMethodsExists = await RyftPaymentMethods.findOne({
          cardId: card.id,
        });

        if (!paymentMethodsExists) {
          return res
            .status(404)
            .json({ data: { message: "Payment methods does not found." } });
        } else {
          params.paymentMethodId = paymentMethodsExists?.paymentMethod;
          createSessionUnScheduledPayment(params)
            .then(async (_res: any) => {
              console.log("payment initiated!");
              if (!user?.xeroContactId) {
                console.log(
                  "xeroContact ID not found. Failed to generate pdf."
                );
              }
              let response: PaymentResponse = {
                message: "In progress",
                status: 200,
              };
              if (_res.data.status == "PendingAction") {
                const sessionInformation: any = await createSessionInitial(
                  params
                );
                response.message = "Further Action Required";
                response.manualPaymentConfig = {
                  clientSecret: sessionInformation?.data?.clientSecret,
                  paymentType: sessionInformation?.data?.paymentType,
                  publicKey: process.env.RYFT_PUBLIC_KEY,
                  customerPaymentMethods: _res.data.paymentMethod,
                };
                response.sessionID = _res.data?.id;

                response.status = "manual_payment_required";
              } else {
                response.message =
                  "Your payment was successful, please refresh in few minutes to see your new balance";
                response.status = 200;
                response.sessionID = _res.data?.id;
              }

              return res.json({
                data: response,
              });
            })
            .catch(async (err) => {
              console.log(
                "error in payment Api",
                err.response.data,
                new Date(),
                "Today's Date"
              );
              //fixme: store error transacation in db also
              return res.status(400).json({
                data: err.response.data,
              });
            });
        }
      } else {
        const currencyObj = countryCurrency.find(
          ({ country, value }) =>
            country === user?.country && value === user?.currency
        );
        let amountToPay;
        if (currencyObj?.VAT) {
          amountToPay =
            (parseInt(input?.amount) +
              (parseInt(input?.amount) * currencyObj?.VAT) / 100) *
            100;
        } else {
          amountToPay = parseInt(input?.amount) * 100;
        }

        const validateAmount = amountToPay / 100;
        if (validateAmount > AMOUNT.MAX) {
          return res.status(400).json({
            error: {
              message: `Charged amount should be less than ${AMOUNT.MAX}.`,
            },
          });
        }
        const params: any = {
          amount: amountToPay,
          // (parseInt(input?.amount) + (parseInt(input?.amount) * VAT) / 100) *
          // 100,
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
        createPaymentOnStrip(params, false)
          .then(async (_res: any) => {
            console.log("payment initiated!", new Date(), "Today's Date");
            if (!user?.xeroContactId) {
              console.log(
                "xeroContact ID not found. Failed to generate pdf.",
                new Date(),
                "Today's Date"
              );
            }
            let response: PaymentResponse = {
              message: "In progress",
              status: 200,
            };
            response.message =
              "Your payment was successful, please refresh in few minutes to see your new balance";
            response.status = 200;
            response.sessionID = _res.id;
            response.paymentMethods = _res.payment_method;
            return res.json({
              data: response,
            });
          })
          .catch(async (err) => {
            console.log(
              "error in payment Api",
              err.response.data,
              new Date(),
              "Today's Date"
            );
            //fixme: store error transacation in db also
            return res.status(400).json({
              data: err.response.data,
            });
          });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static createSession = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    let sessionObject: any = {};
    if (process.env.PAYMENT_MODE === CARD.STRIPE) {
      if (input.clientId === "") {
        const user = await User.findById(input.userId);
        if (user) {
          const params = {
            email: user?.email,
            firstName: user?.firstName,
            lastName: user?.lastName,
            userId: user?._id,
          };
          const response: any = await createCustomerOnStripe(params);
          input.clientId = response?.data?.id;
        }
      }
      paymentIntent(input)
        .then(async (response: any) => {
          (sessionObject.clientSecret = response.client_secret),
            (sessionObject.status = response?.status);
          sessionObject.sessionID = response.id;
          return res.json({ data: sessionObject });
        })
        .catch(async (error) => {
          return res
            .status(400)
            .json({ data: { message: "Error in creating intent", error } });
        });
    } else {
      createSessionInitial(input)
        .then(async (response: any) => {
          (sessionObject.clientSecret = response.data.clientSecret),
            (sessionObject.publicKey = process.env.RYFT_PUBLIC_KEY);
          sessionObject.status = response.data.status;
          sessionObject.paymentType = response.data.paymentType;
          const paymentMethods: any = await customerPaymentMethods(
            response.data.customerDetails.id
          );
          sessionObject.paymentMethods = paymentMethods.data;
          return res.json({ data: sessionObject });
        })
        .catch(async (error) => {
          return res
            .status(400)
            .json({ data: { message: "Error in creating session", error } });
        });
    }
  };

  static handlepaymentStatusWebhook = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;
    try {
      const customerId = input.data.customer?.id;
      let userId: UserInterface =
        (await User.findOne({
          ryftClientId: customerId,
          role: RolesEnum.USER,
        })) ?? ({} as UserInterface);
      const card: RyftPaymentInterface =
        (await RyftPaymentMethods.findOne({
          paymentMethod: input.data?.paymentMethod?.id,
        })) ?? ({} as RyftPaymentInterface);
      const cardDetailsExist = await CardDetails.findById(card?.cardId);
      let originalAmount = parseInt(input.data.amount) / 100 / (1 + VAT / 100);
      let isFreeCredited: boolean;
      const txn: TransactionInterface[] =
        (await Transaction.find({
          userId: userId?.id,
          title: transactionTitle.CREDITS_ADDED,
          isCredited: true,
          status: PAYMENT_STATUS.CAPTURED,
          amount: { $gt: 0 },
        })) ?? ([] as TransactionInterface[]);
      if (txn?.length > 0) {
        isFreeCredited = true;
      } else {
        isFreeCredited = false;
      }
      if (userId) {
        if (input.eventType == "PaymentSession.declined") {
          userId = (await User.findById(userId?.id)) ?? ({} as UserInterface);
          const card: RyftPaymentInterface =
            (await RyftPaymentMethods.findOne({
              paymentMethod: input.data?.paymentMethod?.id,
            })) ?? ({} as RyftPaymentInterface);
          const cardDelete: CardDetailsInterface =
            (await CardDetails.findOne({
              paymentMethod: input.data?.paymentMethod?.id,
              isDeleted: false,
            })) ?? ({} as CardDetailsInterface);
          await CardDetails.findByIdAndUpdate(cardDelete?.id, {
            isDeleted: true,
          });
          const business = await BusinessDetails.findById(
            userId?.businessDetailsId
          );
          let message = {
            firstName: userId?.firstName,
            amount: parseInt(input.data.amount) / 100,
            cardHolderName: `${userId?.firstName} ${userId?.lastName}`,
            cardNumberEnd: cardDetailsExist?.cardNumber,
            credits: userId?.credits,
            businessName: business?.businessName,
            currency: CURRENCY_SIGN.GBP,
            isIncVat: true,
          };
          if (userId.currency === CURRENCY.DOLLER) {
            message.currency = CURRENCY_SIGN.USD;
          } else if (userId.currency === CURRENCY.EURO) {
            message.currency = CURRENCY_SIGN.EUR;
            message.isIncVat = false;
          }
          sendEmailForPaymentFailure(userId?.email, message);
          let dataToSaveInTransaction: Partial<TransactionInterface> = {
            userId: userId?.id,
            amount: input?.data?.amount / 100,
            status: PAYMENT_STATUS.DECLINE,
            title: transactionTitle.PAYMNET_FAILED,
            isCredited: false,
            isDebited: false,
            invoiceId: "",
            paymentSessionId: input.data.id,
            cardId: card?.cardId,
            creditsLeft: userId?.credits || 0,
            paymentMethod: input.data?.paymentMethod?.id,
          };
          if (userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD) {
            dataToSaveInTransaction.paymentType = PAYMENT_TYPE_ENUM.AUTO_CHARGE;
          }
          await Transaction.create(dataToSaveInTransaction);
        } else if (input.eventType == "PaymentSession.captured") {
          const cardDetails = await CardDetails.findByIdAndUpdate(
            card?.cardId,
            {
              status: PAYMENT_SESSION.SUCCESS,
            },
            { new: true }
          );
          // TODO: apply conditipon for user does not iuncludes in promo link.users
          userId.id = new ObjectId(userId?.id);
          const promoLink = await FreeCreditsLink.findOne({
            _id: new ObjectId(userId?.promoLinkId),
            isDeleted: false,
          });
          let params: webhhokParams = {
            buyerId: userId?.buyerId,
            fixedAmount: originalAmount,
          };

          //TODO: THIS WILL BE ONLY ON 1 TRANSATION
          if (
            promoLink &&
            !userId.promoCodeUsed &&
            userId?.promoLinkId &&
            userId.premiumUser == PROMO_LINK.PREMIUM_USER_TOP_UP &&
            originalAmount >=
              promoLink?.topUpAmount * parseInt(userId?.leadCost) &&
            !isFreeCredited
          ) {
            params.freeCredits =
              promoLink?.freeCredits * parseInt(userId?.leadCost);
          } else if (
            promoLink?.spotDiffPremiumPlan &&
            originalAmount >=
              promoLink?.topUpAmount * parseInt(userId?.leadCost) &&
            userId.promoCodeUsed &&
            !isFreeCredited
          ) {
            params.freeCredits =
              promoLink?.freeCredits * parseInt(userId?.leadCost);
          } else if (
            !userId.promoCodeUsed &&
            originalAmount >=
              PREMIUM_PROMOLINK.TOP_UP * parseInt(userId?.leadCost) &&
            !isFreeCredited
          ) {
            params.freeCredits =
              PREMIUM_PROMOLINK.FREE_CREDITS * parseInt(userId?.leadCost);
          }
          addCreditsToBuyer(params)
            .then(async (res: any) => {
              userId =
                (await User.findById(userId?.id)) ?? ({} as UserInterface);
              let dataToSaveInTransaction: Partial<TransactionInterface> = {
                userId: userId?.id,
                amount: originalAmount,
                status: PAYMENT_STATUS.CAPTURED,
                title: transactionTitle.CREDITS_ADDED,
                isCredited: true,
                invoiceId: "",
                paymentSessionId: input.data.id,
                cardId: card?.cardId,
                creditsLeft: userId?.credits || 0 - (params.freeCredits || 0),
                paymentMethod: input.data?.paymentMethod?.id,
              };
              if (
                userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD
              ) {
                dataToSaveInTransaction.paymentType =
                  PAYMENT_TYPE_ENUM.AUTO_CHARGE;
              }
              const prevTransaction = await Transaction.find({
                userId: userId?.id,
                status: PAYMENT_STATUS.CAPTURED,
                isCredited: true,
              });
              if (!prevTransaction || prevTransaction.length === 0) {
                await User.findByIdAndUpdate(userId?.id, {
                  isSignUpCompleteWithCredit: true,
                });

                fullySignupWithCredits(userId?.id, cardDetails?.id);
                let data = await userData(userId?.id, cardDetails?.id);
                const formattedPostCodes = data?.postCodeTargettingList
                  .map((item: any) => item.postalCode)
                  .flat();
                data.area = formattedPostCodes;
                sendEmailForFullySignupToAdmin(data);
              }
              const transaction = await Transaction.create(
                dataToSaveInTransaction
              );
              const save: Partial<TransactionInterface> = {
                userId: userId?.id,
                amount: input?.data?.amount / 100 - originalAmount,
                status: PAYMENT_STATUS.CAPTURED,
                title: transactionTitle.INVOICES_VAT,
                isCredited: true,
                invoiceId: "",
                paymentSessionId: input.data.id,
                cardId: card?.cardId,
                creditsLeft: userId?.credits || 0 - (params.freeCredits || 0),
                paymentMethod: input.data?.paymentMethod?.id,
              };
              if (
                userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD
              ) {
                save.paymentType = PAYMENT_TYPE_ENUM.AUTO_CHARGE;
              }
              const transactionForVat = await Transaction.create(save);
              const business = await BusinessDetails.findById(
                userId?.businessDetailsId
              );
              const message = {
                firstName: userId?.firstName,
                amount: parseInt(input.data.amount) / 100,
                cardHolderName: `${userId?.firstName} ${userId?.lastName}`,
                cardNumberEnd: cardDetails?.cardNumber,
                credits: userId?.credits,
                businessName: business?.businessName,
                currency: CURRENCY_SIGN.GBP,
                isIncVat: true,
              };
              if (userId.currency === CURRENCY.DOLLER) {
                message.currency = CURRENCY_SIGN.USD;
              } else if (userId.currency === CURRENCY.EURO) {
                message.currency = CURRENCY_SIGN.EUR;
                message.isIncVat = false;
              }
              sendEmailForPaymentSuccess(userId?.email, message);
              let invoice: InvoiceInterface | null;
              if (userId?.xeroContactId) {
                let freeCredits: number;
                if (params.freeCredits) {
                  freeCredits = params.freeCredits;
                } else {
                  freeCredits = params.freeCredits || 0;
                }

                const paramPdf: generatePDFParams = {
                  ContactID: userId?.xeroContactId,
                  desc: transactionTitle.CREDITS_ADDED,
                  amount: originalAmount,
                  freeCredits: freeCredits,
                  sessionId: input.data.id,
                  isManualAdjustment: false,
                };
                generatePDF(paramPdf)
                  .then(async (res: any) => {
                    const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                      userId: userId?.id,
                      transactionId: transaction.id,
                      price: userId?.credits,
                      invoiceId: res.data.Invoices[0].InvoiceID,
                    };
                    invoice = await Invoice.create(dataToSaveInInvoice);
                    await Transaction.findByIdAndUpdate(transaction.id, {
                      invoiceId: res.data.Invoices[0].InvoiceID,
                    });
                    await Transaction.findByIdAndUpdate(transactionForVat.id, {
                      invoiceId: res.data.Invoices[0].InvoiceID,
                    });

                    console.log("pdf generated", new Date(), "Today's Date");
                  })
                  .catch(async (err) => {
                    refreshToken().then(async (res) => {
                      const paramPdf: generatePDFParams = {
                        ContactID: userId?.xeroContactId,
                        desc: transactionTitle.CREDITS_ADDED,
                        amount: originalAmount,
                        freeCredits: freeCredits,
                        sessionId: input.data.id,
                        isManualAdjustment: false,
                      };
                      generatePDF(paramPdf).then(async (res: any) => {
                        const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                          userId: userId?.id,
                          transactionId: transaction.id,
                          price: userId?.credits,
                          invoiceId: res.data.Invoices[0].InvoiceID,
                        };
                        invoice = await Invoice.create(dataToSaveInInvoice);
                        await Transaction.findByIdAndUpdate(transaction.id, {
                          invoiceId: res.data.Invoices[0].InvoiceID,
                        });

                        console.log(
                          "pdf generated",
                          new Date(),
                          "Today's Date"
                        );
                      });
                    });
                  });
              }
              if (params.freeCredits) {
                userId =
                  (await User.findById(userId?.id)) ?? ({} as UserInterface);
                const dataToSaveInTxn = {
                  userId: userId?.id,
                  amount: params.freeCredits,
                  status: PAYMENT_STATUS.CAPTURED,
                  title: transactionTitle.FREE_CREDITS,
                  isCredited: true,
                  //@ts-ignore
                  invoiceId: invoice?.invoiceId,
                  paymentSessionId: input.data.id,
                  cardId: card?.cardId,
                  creditsLeft: userId?.credits,
                };
                await Transaction.create(dataToSaveInTxn);
              }
            })
            .catch((error) => {
              console.log(
                "error in webhook",
                error,
                new Date(),
                "Today's Date"
              );
            });
        } else if (input.eventType == "PaymentSession.approved") {
          const card = await RyftPaymentMethods.findOne({
            paymentMethod: input.data?.paymentMethod?.id,
          });
          await CardDetails.findByIdAndUpdate(
            card?.cardId,
            {
              status: PAYMENT_SESSION.SUCCESS,
            },
            { new: true }
          );
        }
      }
      const dataToShow: webhookResponse = {
        message: "success",
        sessionId: input?.data?.id,
      };
      if (input.eventType === "PaymentSession.captured") {
        dataToShow.status = PAYMENT_STATUS.CAPTURED;
      } else if (input.eventType === "PaymentSession.approved") {
        dataToShow.status = PAYMENT_STATUS.APPROVED;
      } else if (input.eventType === "PaymentSession.declined") {
        dataToShow.status = PAYMENT_STATUS.DECLINE;
      }
      res.status(200).json({ data: dataToShow });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static handlepaymentStatusWebhookStripe = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;
    try {
      const customerId = input.data.object?.customer;
      const paymentMethodId = input.data.object?.payment_method;
      const user = await getUserDetails(customerId, paymentMethodId);
      let userId = user.user ?? ({} as UserInterface);
      const card = user.card;
      const amount = parseInt(input.data.object?.amount);
      let originalAmount = getOriginalAmountForStripe(
        amount,
        input.data.object?.currency
      );
      if (userId) {
        if (input.type == STRIPE_PAYMENT_STATUS.FAILED) {
          const business = user.business;
          const cards = await CardDetails.findOne({
            userId: userId?._id,
            isDefault: true,
            isDeleted: false,
          });

          let message = {
            firstName: userId?.firstName,
            amount: amount,
            cardHolderName: `${userId?.firstName} ${userId?.lastName}`,
            cardNumberEnd: cards?.cardNumber,
            credits: userId?.credits,
            businessName: business?.businessName,
            currency: CURRENCY_SIGN.GBP,
            isIncVat: true,
          };

          if (userId.currency === CURRENCY.DOLLER) {
            message.currency = CURRENCY_SIGN.USD;
            message.isIncVat = false;
          } else if (userId.currency === CURRENCY.EURO) {
            message.currency = CURRENCY_SIGN.EUR;
            message.isIncVat = false;
          }

          sendEmailForPaymentFailure(userId?.email, message);
          let dataToSaveInTransaction: Partial<TransactionInterface> = {
            userId: userId?.id,
            amount: originalAmount,
            status: PAYMENT_STATUS.DECLINE,
            title: transactionTitle.PAYMNET_FAILED,
            isCredited: false,
            isDebited: false,
            invoiceId: "",
            paymentSessionId: input.data.object?.id,
            cardId: card?._id,
            creditsLeft: userId?.credits || 0,
            paymentMethod: input.data?.object.payment_method,
            notes: input.data.object.last_payment_error.code,
          };
          if (userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD) {
            dataToSaveInTransaction.paymentType = PAYMENT_TYPE_ENUM.AUTO_CHARGE;
          }
          await Transaction.create(dataToSaveInTransaction);
        } else if (input.type == STRIPE_PAYMENT_STATUS.SUCCESS) {
          const cardDetails = await CardDetails.findByIdAndUpdate(
            card?._id,
            {
              status: PAYMENT_SESSION.SUCCESS,
            },
            { new: true }
          );
          // TODO: apply conditipon for user does not iuncludes in promo link.users
          userId.id = new ObjectId(userId?.id);
          const promoLink = await FreeCreditsLink.findOne({
            _id: new ObjectId(userId?.promoLinkId),
            isDeleted: false,
          });
          let params: webhhokParams = {
            buyerId: userId?.buyerId,
            fixedAmount: originalAmount,
          };
          params.freeCredits = await checkUserUsedPromoCode(
            userId.id,
            promoLink?.id,
            originalAmount
          );
          let commonDataSaveInTransaction = {
            userId: userId?.id,
            amount: originalAmount,
            status: "",
            title: "",
            invoiceId: "",
            paymentSessionId: input.data.object.id,
            cardId: card?._id,
            creditsLeft: userId?.credits || 0 - (params.freeCredits || 0),
            paymentMethod: input.data?.object?.payment_method,
            paymentType: "",
            isCredited: true,
          };
          addCreditsToBuyer(params)
            .then(async (res: any) => {
              userId =
                (await User.findById(userId?.id)
                  .populate("userLeadsDetailsId")
                  .populate("businessDetailsId")) ?? ({} as UserInterface);

              (commonDataSaveInTransaction.status = PAYMENT_STATUS.CAPTURED),
                (commonDataSaveInTransaction.title =
                  transactionTitle.CREDITS_ADDED);
              if (
                userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD
              ) {
                commonDataSaveInTransaction.paymentType =
                  PAYMENT_TYPE_ENUM.AUTO_CHARGE;
              }
              const prevTransaction = await Transaction.find({
                userId: userId?.id,
                status: PAYMENT_STATUS.CAPTURED,
                isCredited: true,
              });
              if (!prevTransaction || prevTransaction.length === 0) {
                await User.findByIdAndUpdate(userId?.id, {
                  isSignUpCompleteWithCredit: true,
                });
                fullySignupWithCredits(userId?.id, cardDetails?.id);
                cmsUpdateBuyerWebhook(userId?.id, cardDetails?.id);
                let data = await userData(userId?.id, cardDetails?.id);
                const formattedPostCodes = data?.postCodeTargettingList
                  .map((item: any) => item.postalCode)
                  .flat();
                data.area = formattedPostCodes;
                sendEmailForFullySignupToAdmin(data);
              }
              const transaction = await Transaction.create(
                commonDataSaveInTransaction
              );

              (commonDataSaveInTransaction.status = PAYMENT_STATUS.CAPTURED),
                (commonDataSaveInTransaction.amount =
                  amount / 100 - originalAmount),
                (commonDataSaveInTransaction.title =
                  transactionTitle.INVOICES_VAT),
                (commonDataSaveInTransaction.isCredited = true),
                (commonDataSaveInTransaction.invoiceId = ""),
                (commonDataSaveInTransaction.creditsLeft =
                  userId?.credits || 0 - (params.freeCredits || 0));

              if (
                userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD
              ) {
                commonDataSaveInTransaction.paymentType =
                  PAYMENT_TYPE_ENUM.AUTO_CHARGE;
              }

              const transactionForVat = await Transaction.create(
                commonDataSaveInTransaction
              );
              const business = await BusinessDetails.findById(
                userId?.businessDetailsId
              );
              let message = {
                firstName: userId?.firstName,
                amount: amount,
                cardHolderName: `${userId?.firstName} ${userId?.lastName}`,
                cardNumberEnd: cardDetails?.cardNumber,
                credits: userId?.credits,
                businessName: business?.businessName,
                currency: CURRENCY_SIGN.GBP,
                isIncVat: true,
              };
              if (userId.currency === CURRENCY.DOLLER) {
                message.currency = CURRENCY_SIGN.USD;
              } else if (userId.currency === CURRENCY.EURO) {
                message.currency = CURRENCY_SIGN.EUR;
                message.isIncVat = false;
              }
              sendEmailForPaymentSuccess(userId?.email, message);
              let invoice: InvoiceInterface | null;
              if (userId?.xeroContactId) {
                let freeCredits: number;
                if (params.freeCredits) {
                  freeCredits = params.freeCredits;
                } else {
                  freeCredits = params.freeCredits || 0;
                }

                const paramPdf: generatePDFParams = {
                  ContactID: userId?.xeroContactId,
                  desc: transactionTitle.CREDITS_ADDED,
                  amount: originalAmount,
                  freeCredits: freeCredits,
                  sessionId: input.data.object.id,
                  isManualAdjustment: false,
                };
                generatePDF(paramPdf)
                  .then(async (res: any) => {
                    const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                      userId: userId?.id,
                      transactionId: transaction.id,
                      price: userId?.credits,
                      invoiceId: res.data.Invoices[0].InvoiceID,
                    };
                    invoice = await Invoice.create(dataToSaveInInvoice);
                    await Transaction.findByIdAndUpdate(transaction.id, {
                      invoiceId: res.data.Invoices[0].InvoiceID,
                    });
                    await Transaction.findByIdAndUpdate(transactionForVat.id, {
                      invoiceId: res.data.Invoices[0].InvoiceID,
                    });

                    console.log("pdf generated", new Date(), "Today's Date");
                  })
                  .catch(async (err) => {
                    refreshToken().then(async (res) => {
                      const paramPdf: generatePDFParams = {
                        ContactID: userId?.xeroContactId,
                        desc: transactionTitle.CREDITS_ADDED,
                        amount: originalAmount,
                        freeCredits: freeCredits,
                        sessionId: input.data.object?.id,
                        isManualAdjustment: false,
                      };
                      generatePDF(paramPdf).then(async (res: any) => {
                        const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                          userId: userId?.id,
                          transactionId: transaction.id,
                          price: userId?.credits,
                          invoiceId: res.data.Invoices[0].InvoiceID,
                        };
                        invoice = await Invoice.create(dataToSaveInInvoice);
                        await Transaction.findByIdAndUpdate(transaction.id, {
                          invoiceId: res.data.Invoices[0].InvoiceID,
                        });

                        console.log(
                          "pdf generated",
                          new Date(),
                          "Today's Date"
                        );
                      });
                    });
                  });
              }
              if (params.freeCredits) {
                userId =
                  (await User.findById(userId?.id)) ?? ({} as UserInterface);

                (commonDataSaveInTransaction.amount = params.freeCredits),
                  (commonDataSaveInTransaction.status =
                    PAYMENT_STATUS.CAPTURED),
                  (commonDataSaveInTransaction.title =
                    transactionTitle.FREE_CREDITS),
                  (commonDataSaveInTransaction.isCredited = true),
                  //@ts-ignore
                  (commonDataSaveInTransaction.invoiceId = invoice?.invoiceId),
                  (commonDataSaveInTransaction.creditsLeft = userId?.credits),
                  await Transaction.create(commonDataSaveInTransaction);
              }
              const userBusiness = await BusinessDetails.findById(
                userId.businessDetailsId,
                "businessName"
              );
              const userLead =
                (await UserLeadsDetails.findById(
                  userId?.userLeadsDetailsId,
                  "postCodeTargettingList"
                )) ?? ({} as UserLeadsDetailsInterface);
              let paramsToSend: PostcodeWebhookParams = {
                userId: userId._id,
                buyerId: userId.buyerId,
                businessName: userBusiness?.businessName,
                eventCode: EVENT_TITLE.ADD_CREDITS,
                topUpAmount: originalAmount,
                type: POSTCODE_TYPE.MAP,
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
                  console.log(
                    "event webhook for add credits hits successfully.",
                    paramsToSend,
                    new Date(),
                    "Today's Date"
                  )
                )
                .catch((err) =>
                  console.log(
                    err,
                    "error while triggering add credits webhooks failed",
                    paramsToSend,
                    new Date(),
                    "Today's Date"
                  )
                );
            })
            .catch((error) => {
              console.log(
                "error in webhook",
                error,
                new Date(),
                "Today's Date"
              );
            });
        }
      }
      const dataToShow: webhookResponse = {
        message: "success",
        sessionId: input?.data?.object?.id,
      };
      if (input.type === STRIPE_PAYMENT_STATUS.SUCCESS) {
        dataToShow.status = STRIPE_PAYMENT_STATUS.SUCCESS;
      } else if (input.type === STRIPE_PAYMENT_STATUS.FAILED) {
        dataToShow.status = STRIPE_PAYMENT_STATUS.FAILED;
      }
      res.status(200).json({ data: dataToShow });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static retrievePaymentSssion = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const sessionId = req.query.ps;
    let userData: UserInterface;
    let cardData: CardDetailsInterface;
    const shouldReturnJson = !!req.query.requestJson || false;
    let config = {
      method: "get",
      url: `${process.env.RYFT_PAYMENT_METHODS_BY_PAYMENT_SESSION_ID}/${sessionId}`,
      headers: {
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };
    axios(config)
      .then(async function (response: any): Promise<any> {
        const sessionData = response.data;
        const { customerDetails, paymentMethod, amount } = sessionData;
        const user =
          (await User.findOne({ ryftClientId: customerDetails.id })) ??
          ({} as UserInterface);
        userData = user;
        const paymentMthods = await RyftPaymentMethods.find({
          paymentMethod: paymentMethod?.tokenizedDetails?.id,
        });
        if (
          (!paymentMthods || paymentMthods.length == 0) &&
          paymentMethod?.tokenizedDetails?.id
        ) {
          const cardExist = await CardDetails.find({
            userId: user?.id,
            isDeleted: false,
          });
          let dataToSave: Record<string, any> = {
            cardNumber: paymentMethod?.card?.last4,
            userId: user?.id,
            paymentSessionID: sessionData?.id,
            status: PAYMENT_SESSION.PENDING,
            paymentMethod: paymentMethod?.tokenizedDetails?.id,
            cardHolderName: `${customerDetails.firstName} ${customerDetails?.lastName}`,
            amount,
          };
          if (
            sessionData.status === "Captured" ||
            sessionData.status === "Approved"
          ) {
            dataToSave.status = PAYMENT_SESSION.SUCCESS;
          }
          if (
            cardExist.length == 0 &&
            (sessionData.status === "Captured" ||
              sessionData.status === "Approved")
          ) {
            dataToSave.isDefault = true;
          }
          let existingCardNumbers: Array<string> = [];
          cardExist.map((card) => {
            existingCardNumbers.push(card.cardNumber);
          });
          if (
            !existingCardNumbers.includes(
              (paymentMethod?.card?.last4).toString()
            )
          ) {
            const card = await CardDetails.create(dataToSave);
            cardData = card;
            await Transaction.create({
              userId: user?.id,
              cardId: card?.id,
              amount: 0,
              status: TRANSACTION_STATUS.SUCCESS,
              paymentSessionId: sessionId,
              paymentMethod: card?.paymentMethod,
              title: transactionTitle.SESSION_CREATED,
            });
            await RyftPaymentMethods.create({
              userId: user?.id,
              ryftClientId: customerDetails?.id,
              paymentMethod: paymentMethod?.tokenizedDetails?.id,
              cardId: card?.id,
            });
          } else {
            return res
              .status(422)
              .json({ error: { message: "Card Already Exist" } });
          }
          await User.findByIdAndUpdate(user?.id, {
            onBoarding: [
              {
                key: ONBOARDING_KEYS.BUSINESS_DETAILS,
                pendingFields: [],
                dependencies: [],
              },
              {
                key: ONBOARDING_KEYS.LEAD_DETAILS,
                pendingFields: [],
                dependencies: [],
              },
              {
                key: ONBOARDING_KEYS.CARD_DETAILS,
                pendingFields: [],
                dependencies: [],
              },
            ],
            onBoardingPercentage: 100,
          });
        }

        if (shouldReturnJson) {
          res.json({
            data: {
              message:
                "Card successfully added, please wait a few minutes for it to be verified.",
            },
          });
        } else {
          //need to change here in url
          res.status(302).redirect(process.env.RETURN_URL || "");
        }
      })
      .catch(async function (error: any) {
        if (shouldReturnJson) {
          await Transaction.create({
            userId: userData?.id,
            cardId: cardData?.id,
            amount: 0,
            status: TRANSACTION_STATUS.FAIL,
            paymentSessionId: sessionId,
            paymentMethod: cardData?.paymentMethod,
            title: transactionTitle.SESSION_CREATED,
            notes: error?.response?.data?.errors[0]?.message,
          });
          res.json({
            message: "Session error",
            error: error,
          });
        } else {
          //need to change here in url
          res.status(302).redirect(process.env.RETURN_URL || "");
        }
      });
  };

  static getPaymentSession = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const sessionId: any = req.query.ps;
    let card = await CardDetails.findOne({
      paymentMethod: req.query?.paymentMethods,
      isDeleted: false,
    });

    if (card?.cardType === CARD.STRIPE) {
      const data = await getPaymentStatus(sessionId);
      return res.status(200).json({ data: data });
    } else {
      let config = {
        method: "get",
        url: `${process.env.RYFT_PAYMENT_METHODS_BY_PAYMENT_SESSION_ID}/${sessionId}`,
        headers: {
          Authorization: process.env.RYFT_SECRET_KEY,
        },
      };
      axios(config)
        .then(async function (response: any) {
          const sessionData = response.data;
          const dataToShow = {
            sessionId: sessionData.id,
            status: sessionData.status,
          };
          return res.status(200).json({ data: dataToShow });
        })
        .catch(function (error: any) {
          return res.status(400).json({ error: { message: "Fail" } });
        });
    }
  };

  static stripeReturnURL = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.query;
    const setupIntent = String(input.setup_intent);
    try {
      if (setupIntent) {
        const details: any = await getStripePaymentMethods(setupIntent);
        const userDetails = await getUserDetailsByPaymentMethods(
          details?.payment_method
        );
        const user = await User.findOne({
          stripeClientId: details.customer,
        });
        const cards = await CardDetails.findOne({
          userId: user?._id,
          isDeleted: false,
        });
        const checkExists = await CardDetails.find({
          cardNumber: userDetails.card?.last4,
          userId: user?._id,
          isDeleted: false,
        });
        if (checkExists.length > 0) {
          res.redirect(`${process.env.TEMP_RETURN_URL}/?status_code=420` || "");
        } else {
          let dataToSave = {
            paymentMethod: details.payment_method,
            paymentSessionID: details.id,
            status: PAYMENT_STATUS.CAPTURED,
            userId: user?._id,
            cardHolderName: user?.firstName,
            cardNumber: userDetails.card?.last4,
            expiryMonth: userDetails.card?.exp_month,
            expiryYear: userDetails.card?.exp_year,
            cardType: CARD.STRIPE,
            isDefault: false,
          };
          if (!cards) {
            dataToSave.isDefault = true;
          }
          await CardDetails.create(dataToSave);
          await User.findByIdAndUpdate(
            user?._id,
            {
              onBoarding: [
                {
                  key: ONBOARDING_KEYS.BUSINESS_DETAILS,
                  pendingFields: [],
                  dependencies: [],
                },
                {
                  key: ONBOARDING_KEYS.LEAD_DETAILS,
                  pendingFields: [],
                  dependencies: [],
                },
                {
                  key: ONBOARDING_KEYS.CARD_DETAILS,
                  pendingFields: [],
                  dependencies: [],
                },
              ],
              onBoardingPercentage: 100,
            },
            { new: true }
          );
          res.status(302).redirect(process.env.TEMP_RETURN_URL || "");
        }
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };
}

async function getUserDetails(cid: string, pid: string) {
  const user = await User.findOne({ stripeClientId: cid })
    .populate("businessDetailsId")
    .populate("userLeadsDetailsId");
  const card = await CardDetails.findOne({
    paymentMethod: pid,
    isDeleted: false,
  });
  const business = await BusinessDetails.findById(user?.businessDetailsId);

  const obj = { user: user, card: card, business: business };
  return obj;
}

export function getOriginalAmountForStripe(amount: number, currency: string) {
  let originalAmount;
  if (currency === stripeCurrency.GBP || currency === stripeCurrency.USD) {
    originalAmount = amount / (1 + VAT / 100) / 100;
  } else {
    originalAmount = amount / 100;
  }

  return originalAmount;
}

async function isUserFreeCredited(userId: string) {
  const txn = await Transaction.find({
    userId: userId,
    title: transactionTitle.CREDITS_ADDED,
    isCredited: true,
    status: PAYMENT_STATUS.CAPTURED,
    amount: { $gt: 0 },
  });
  if (txn?.length > 0) {
    return true;
  } else {
    return false;
  }
}

async function checkUserUsedPromoCode(
  userId: string,
  promoLinkId: string,
  amount: number
) {
  const user = (await User.findById(userId)) ?? ({} as UserInterface);
  const promoLink = await FreeCreditsLink.findById(promoLinkId);
  const isFreeCredited = await isUserFreeCredited(userId);
  let freeCredits;
  if (
    promoLink &&
    !user.promoCodeUsed &&
    user?.promoLinkId &&
    user.premiumUser == PROMO_LINK.PREMIUM_USER_TOP_UP &&
    amount >= promoLink?.topUpAmount * parseInt(user?.leadCost) &&
    !isFreeCredited
  ) {
    freeCredits = promoLink?.freeCredits * parseInt(user?.leadCost);
  } else if (
    promoLink?.spotDiffPremiumPlan &&
    amount >= promoLink?.topUpAmount * parseInt(user?.leadCost) &&
    user.promoCodeUsed &&
    !isFreeCredited
  ) {
    freeCredits = promoLink?.freeCredits * parseInt(user?.leadCost);
  } else if (
    !user.promoCodeUsed &&
    amount >= PREMIUM_PROMOLINK.TOP_UP * parseInt(user?.leadCost) &&
    !isFreeCredited
  ) {
    freeCredits = PREMIUM_PROMOLINK.FREE_CREDITS * parseInt(user?.leadCost);
  }
  return freeCredits;
}
