import { validate } from "class-validator";
import { Request, Response } from "express";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { UpdateCardInput } from "../Inputs/UpdateCard.input";
import { AdminSettings } from "../Models/AdminSettings";
import { CardDetails } from "../Models/CardDetails";
import { User } from "../Models/User";
import { Transaction } from "../Models/Transaction";
import { managePayments } from "../../utils/payment";
import { PaymentInput } from "../Inputs/Payment.input";
import {
  send_email_for_registration,
  send_email_for_new_registration,
} from "../Middlewares/mail";
import { generatePDF } from "../../utils/XeroApiIntegration/generatePDF";
import { Invoice } from "../Models/Invoice";
import { refreshToken } from "../../utils/XeroApiIntegration/createContact";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import { signUpFlowEnums } from "../../utils/Enums/signupFlow.enum";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { BusinessDetails } from "../Models/BusinessDetails";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";


export class CardDetailsControllers {
  static create = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
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

      let dataToSave: any = {
        userId: input.userId,
        cardHolderName: input.cardHolderName,
        //to trim the space between card number, will replace first space in string to ""
        cardNumber: input.cardNumber.replace(/ +/g, ""),
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        cvc: input.cvc,
        amount: input.amount,
        isDefault: input.isDefault,
      };
      const user: any = await User.findById(input.userId)
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId");
      if (user) {
        //@ts-ignore

        user.businessDetailsId?.businessOpeningHours = JSON.parse(
          //@ts-ignore
          user?.businessDetailsId?.businessOpeningHours
        );
      }

      if (!user.isRyftCustomer || !user.isLeadbyteCustomer) {
        await User.deleteOne({_id:input.userId})
        await BusinessDetails.deleteOne({_id:user.businessDetailsId})
        await UserLeadsDetails.deleteOne({_id:user.userLeadsDetailsId})
        return res.status(403).json({
          error: {
            message:
              "Email already exist on RYFT portal, kindly register with another Email!",
          },
        });
      }
      const userData = await CardDetails.create(dataToSave);
      if (user.businessDetailsId && user.userLeadsDetailsId) {
        await User.findByIdAndUpdate(input.userId, {
          signUpFlowStatus: signUpFlowEnums.ALL_DONE,
        });
      } else {
        return res.status(403).json({
          error: {
            message: "You have not fill Business or Leads Details",
          },
        });
      }

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
      const emailToNarwhal = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessIndustry: user?.businessDetailsId.businessIndustry,
        businessName: user?.businessDetailsId.businessName,
        businessLogo: user?.businessDetailsId.businessLogo,
        businessSalesNumber: user?.businessDetailsId.businessSalesNumber,
        businessAddress: user?.businessDetailsId.businessAddress,
        businessCity: user?.businessDetailsId.businessCity,
        businessCountry: user?.businessDetailsId.businessCountry,
        businessPostCode: user?.businessDetailsId.businessPostCode,
        businessOpeningHours: JSON.stringify(
          //@ts-ignore
          array
        ),
      };

      send_email_for_new_registration(emailToNarwhal);
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
      let params: PaymentInput = {
        fixedAmount: input.amount,
        email: user.email,
        cardNumber: input.cardNumber.replace(/ +/g, ""),
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        cvc: input.cvc,
        buyerId: user.buyerId,
        freeCredits: 0,
      };
      if (input.code) {
        const checkCode = await FreeCreditsLink.findOne({ code: input.code });
        //@ts-ignore
        params?.freeCredits = checkCode?.freeCredits;
      }
      managePayments(params)
        .then(async (res) => {
          console.log("payment success!!");
          const transactionData: any = {
            userId: input.userId,
            cardId: userData.id,
            isCredited: true,
            status: "success",
            title: transactionTitle.CREDITS_ADDED,
            amount: input.amount,
          };
          const transaction = await Transaction.create(transactionData);
          if (!user.xeroContactId) {
            console.log("xeroContact ID not found. Failed to generate pdf.");
          } else {
            generatePDF(
              user.xeroContactId,
              transactionTitle.CREDITS_ADDED,
              input.amount
            )
              .then(async (res: any) => {
                const dataToSaveInInvoice: any = {
                  userId: input.userId,
                  transactionId: transaction.id,
                  price: input.amount,
                  invoiceId: res.data.Invoices[0].InvoiceID,
                };
                await Invoice.create(dataToSaveInInvoice);
                console.log("PDF generated");
              })
              .catch((error) => {
                console.log("error");
                refreshToken().then((res) => {
                  generatePDF(
                    user.xeroContactId,
                    transactionTitle.CREDITS_ADDED,
                    input.amount
                  ).then(async (res: any) => {
                    const dataToSaveInInvoice: any = {
                      userId: input.userId,
                      transactionId: transaction.id,
                      price: input.amount,
                      invoiceId: res.data.Invoices[0].InvoiceID,
                    };
                    await Invoice.create(dataToSaveInInvoice);
                    console.log("PDF generated");
                  });
                });
              });
          }

          // await User.findByIdAndUpdate(input.userId,{delivery:deliveryEnums.ACTIVE});
        })
        .catch(async (err) => {
          console.log("error in payment Api", err);
          const transactionData: any = {
            userId: input.userId,
            cardId: userData.id,
            isCredited: true,
            title: transactionTitle.CREDITS_ADDED,
            amount: input.amount,
            status: "error",
          };
          await Transaction.create(transactionData);
        });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
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
        cardNumber: input.cardNumber.replace(/ +/g, ""),
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
    try {
      const user = await User.findById(userId);
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
            message: "Enter amount greater than " + adminSettings?.minimumUserTopUpAmount,
          },
        });
      }
      const params: PaymentInput = {
        fixedAmount: input?.amount || adminSettings?.minimumUserTopUpAmount,
        //@ts-ignore
        email: user?.email,
        cardNumber: card?.cardNumber,
        expiryMonth: card?.expiryMonth,
        expiryYear: card?.expiryYear,
        cvc: card?.cvc,
        //@ts-ignore
        buyerId: user?.buyerId,
        freeCredits: 0,
      };
      let amount: number;
      if (input.amount) {
        amount = input.amount;
      } else {
        amount = adminSettings?.minimumUserTopUpAmount;
      }
      managePayments(params)
        .then(async (_res) => {
          console.log("payment success!!");
          const transactionData: any = {
            userId: userId,
            cardId: card.id,
            isCredited: true,
            title: transactionTitle.CREDITS_ADDED,
            status: "success",
            amount: input.amount || adminSettings?.minimumUserTopUpAmount,
          };
          console.log(transactionData)
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
                console.log("PDF generated");
              })
              .catch(async (error) => {
                refreshToken().then(async (_res) => {
                  generatePDF(
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
          };
          await Transaction.create(transactionData);
        });
      async function response() {
        const result = await User.findById(userId, "-password -__v");

        return res.json({ data: result });
      }
      setTimeout(response, 6000);
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}
