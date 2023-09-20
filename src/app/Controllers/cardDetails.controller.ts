import { validate } from "class-validator";
import { Request, Response } from "express";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import {
  addUserXeroId,
  refreshToken,
} from "../../utils/XeroApiIntegration/createContact";
import { generatePDF } from "../../utils/XeroApiIntegration/generatePDF";
// import { managePaymentsByPaymentMethods } from "../../utils/payment";
import { UpdateCardInput } from "../Inputs/UpdateCard.input";
import {
  send_email_for_fully_signup_to_admin,
  send_email_for_new_registration,
  send_email_for_payment_failure,
  send_email_for_payment_success,
  send_email_for_payment_success_to_admin,
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
// import { openingHoursFormatting } from "../../utils/Functions/openingHoursManipulation";
// import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { RolesEnum } from "../../types/RolesEnum";
import axios from "axios";
// import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import {
  createSessionInitial,
  createSessionUnScheduledPayment,
  // createSessionUnScheduledPayment,
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
const ObjectId = mongoose.Types.ObjectId;
import { PaymentResponse } from "../../types/PaymentResponseInterface";
import { PREMIUM_PROMOLINK } from "../../utils/constantFiles/spotDif.offers.promoLink";
import { PAYMENT_TYPE_ENUM } from "../../utils/Enums/paymentType.enum";
import {
  fully_signup_with_credits,
  userData,
} from "../../utils/webhookUrls/fully_signup_with_credits";
// import { managePaymentsByPaymentMethods } from "../../utils/payment";
// import { managePaymentsByPaymentMethods } from "../../utils/payment";

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
      const fixAmount: any = await AdminSettings.findOne();
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
      let dataToSave: any = {
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
    const id = Object(req.user).id;
    try {
      const user: any = await User.findById(id);
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
      });
      if (input?.isUserSignup) {
        await User.findByIdAndUpdate(id, { isUserSignup: true });
      }
      const paymentMethodFromRYFT: any =
        await getPaymentMethodByPaymentSessionID(input.paymentSessionID);
      if (input?.paymentMethod) {
        let dataToSaveIncard: any = {
          userId: user,
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
        let userData: any;
        const cardExist = await CardDetails.findOne({ userId: user?.id });
        const cardExists = await CardDetails.find({
          userId: user?.id,
          isDeleted: false,
        });

        if (!cardExist) {
          dataToSaveIncard.isDefault = true;
        }
        let existingCardNumbers: Array<string> = [];
        cardExists.map((i) => {
          existingCardNumbers.push(i.cardNumber);
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
    //@ts-ignore
    const userId = req.user?.id;
    const input = req.body;

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
            message: "You are not register on RYFT or Lead Byte.",
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
      });
      if (!card) {
        return res
          .status(404)
          .json({ error: { message: "Card Details not found" } });
      }
      const adminSettings: any = await AdminSettings.findOne();
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
      // let amount:any
      // if (input.amount) {
      //   amount = input.amount;
      // } else {
      //   amount = adminSettings?.minimumUserTopUpAmount;
      // }
      const paymentMethodsExists = await RyftPaymentMethods.findOne({
        cardId: card.id,
      });

      // const paymentMethods = await RyftPaymentMethods.find({
      //   ryftClientId: user?.ryftClientId,
      // });
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
              console.log("xeroContact ID not found. Failed to generate pdf.");
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
            console.log("error in payment Api", err.response.data);
            //fixme: store error transacation in db also
            return res.status(400).json({
              data: err.response.data,
            });
          });
        // managePaymentsByPaymentMethods(params)
        //   .then(async (_res: any) => {

        //     const paymentMethods: any = await customerPaymentMethods(
        //       params.clientId
        //     );
        //     let response: PaymentResponse = {
        //       message: "In progress",
        //       status: 200,
        //     };
        //     response.paymentMethods = paymentMethods.data;
        //     if (_res.data.status == "PendingAction") {
        //       // const sessionInformation: any = await createSessionInitial(
        //       //   params
        //       // );
        //       response.message = "Further Action Required";
        //       response.manualPaymentConfig = {
        //         // clientSecret: sessionInformation?.data?.clientSecret,
        //         // paymentType: sessionInformation?.data?.paymentType,
        //         publicKey: process.env.RYFT_PUBLIC_KEY,
        //         customerPaymentMethods: _res.data.paymentMethod,
        //          clientSecret: _res.data?.clientSecret,
        //         paymentType: _res?.data?.paymentType,
        //       };
        //       response.sessionID = _res.data?.id;

        //       response.status = "manual_payment_required";
        //     } else {
        //       response.message =
        //         "Your payment was successful, please refresh in few minutes to see your new balance";
        //       response.status = 200;
        //       response.sessionID = _res.data?.id;
        //     }

        //     return res.json({
        //       data: response,
        //     });
        //   })
        //   .catch(async (err) => {
        //     return res.status(400).json({
        //       error: { message: "Error occured in payment.", err },
        //     });
        //   });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static createInitialSessionRyft = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;
    let sessionObject: any = {};

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
      .catch(async(error) => {
        return res
          .status(400)
          .json({ data: { message: "Error in creating session", error } });
      });
  };

  static handlepaymentStatusWebhook = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;
    const customerId = input.data.customer?.id;
    let userId = await User.findOne({
      ryftClientId: customerId,
      role: RolesEnum.USER,
    });
    const card = await RyftPaymentMethods.findOne({
      paymentMethod: input.data?.paymentMethod?.id,
    });
    const cardDetailsExist = await CardDetails.findById(card?.cardId);
    let originalAmount = parseInt(input.data.amount) / 100 / (1 + VAT / 100);
    let isFreeCredited: boolean;
    const txn: any = await Transaction.find({
      userId: userId?.id,
      title: transactionTitle.CREDITS_ADDED,
      isCredited: true,
      status: PAYMENT_STATUS.CAPTURED,
      amount: { $gt: 0 },
    });
    if (txn?.length > 0) {
      isFreeCredited = true;
    } else {
      isFreeCredited = false;
    }
    if (userId) {
      if (input.eventType == "PaymentSession.declined") {
        userId = await User.findById(userId?.id);
        const card = await RyftPaymentMethods.findOne({
          paymentMethod: input.data?.paymentMethod?.id,
        });
        const cardDelete: any = await CardDetails.find({
          paymentMethod: input.data?.paymentMethod?.id,
        });
        await CardDetails.findByIdAndDelete(cardDelete?.id);
        const business = await BusinessDetails.findById(
          userId?.businessDetailsId
        );
        const message = {
          firstName: userId?.firstName,
          amount: parseInt(input.data.amount) / 100,
          cardHolderName: `${userId?.firstName} ${userId?.lastName}`,
          cardNumberEnd: cardDetailsExist?.cardNumber,
          credits: userId?.credits,
          businessName: business?.businessName,
        };
        send_email_for_payment_failure(userId?.email, message);
        let dataToSaveInTransaction: any = {
          userId: userId?.id,
          amount: input?.data?.amount / 100,
          status: PAYMENT_STATUS.DECLINE,
          title: transactionTitle.PAYMNET_FAILED,
          isCredited: false,
          isDebited: false,
          invoiceId: "",
          paymentSessionId: input.data.id,
          cardId: card?.cardId,
          creditsLeft: userId?.credits,
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
        });
        let params: any = {
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
          console.log("in 1");
        } else if (
          promoLink?.spotDiffPremiumPlan &&
          originalAmount >=
            promoLink?.topUpAmount * parseInt(userId?.leadCost) &&
          userId.promoCodeUsed &&
          !isFreeCredited
        ) {
          params.freeCredits =
            promoLink?.freeCredits * parseInt(userId?.leadCost);
          console.log("in 2");
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
            // console.log("WEBHOOK 3------->>>",res)
            userId = await User.findById(userId?.id);
            let dataToSaveInTransaction: any = {
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
            if (userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD) {
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
              const business = await BusinessDetails.findById(
                userId?.businessDetailsId
              );
              fully_signup_with_credits(userId?.id, cardDetails?.id);
              let data = await userData(userId?.id, cardDetails?.id);
              const formattedPostCodes = data?.postCodeTargettingList
                .map((item: any) => item.postalCode)
                .flat();
              //@ts-ignore
              data.area = formattedPostCodes;
              send_email_for_fully_signup_to_admin(data);
              const message = {
                firstName: userId?.firstName,
                amount: parseInt(input.data.amount) / 100,
                cardHolderName: `${userId?.firstName} ${userId?.lastName}`,
                cardNumberEnd: cardDetails?.cardNumber,
                credits: userId?.credits,
                businessName: business?.businessName,
              };
              send_email_for_payment_success_to_admin(message);
            }
            const transaction = await Transaction.create(
              dataToSaveInTransaction
            );
            const save: any = {
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
            if (userId?.paymentMethod === paymentMethodEnum.AUTOCHARGE_METHOD) {
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
            };
            send_email_for_payment_success(userId?.email, message);
            let invoice;
            if (userId?.xeroContactId) {
              let freeCredits: number;
              if (params.freeCredits) {
                freeCredits = params.freeCredits;
              } else {
                freeCredits = params.freeCredits;
              }
              generatePDF(
                userId?.xeroContactId,
                transactionTitle.CREDITS_ADDED,
                //@ts-ignore
                originalAmount,
                //@ts-ignore
                freeCredits
              )
                .then(async (res: any) => {
                  const dataToSaveInInvoice: any = {
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

                  console.log("PDF generated");
                })
                .catch(async (err) => {
                  refreshToken().then(async (res) => {
                    generatePDF(
                      //@ts-ignore
                      userId?.xeroContactId,
                      transactionTitle.CREDITS_ADDED,
                      //@ts-ignore
                      originalAmount,
                      //@ts-ignore
                      freeCredits
                    ).then(async (res: any) => {
                      const dataToSaveInInvoice: any = {
                        userId: userId?.id,
                        transactionId: transaction.id,
                        price: userId?.credits,
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      };
                      invoice = await Invoice.create(dataToSaveInInvoice);
                      await Transaction.findByIdAndUpdate(transaction.id, {
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      });

                      console.log("PDF generated");
                    });
                  });
                });
            }
            console.log("free credits", params, params.freeCredits);
            if (params.freeCredits) {
              userId = await User.findById(userId?.id);
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
            console.log("ERROR IN WEBHOOK", error);
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
    const dataToShow: any = {
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
  };

  static retrievePaymentSssion = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const sessionId = req.query.ps;
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
        const user = await User.findOne({ ryftClientId: customerDetails.id });
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
          cardExist.map((i) => {
            existingCardNumbers.push(i.cardNumber);
          });
          if (
            !existingCardNumbers.includes(
              (paymentMethod?.card?.last4).toString()
            )
          ) {
            const card = await CardDetails.create(dataToSave);
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
      .catch(function (error: any) {
        if (shouldReturnJson) {
          res.json({
            message: "Session error",
            error: error,
          });
        } else {
          //need to change here in url
          res.status(302).redirect(process.env.RETURN_URL || "");
        }
        // return res.status(400).json({ error: { message: "your payment got failed" } });
        // console.log(error);
      });
  };

  static ryftPaymentSession = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const sessionId = req.query.ps;
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
  };
}
