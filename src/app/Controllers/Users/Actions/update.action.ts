import {Request, Response} from "express"
import { UserInterface } from "../../../../types/UserInterface";
import { User } from "../../../Models/User";
import { RolesEnum } from "../../../../types/RolesEnum";
import { PermissionInterface } from "../../../../types/PermissionsInterface";
import { Permissions } from "../../../Models/Permission";
import { BusinessDetails } from "../../../Models/BusinessDetails";
import { paymentMethodEnum } from "../../../../utils/Enums/payment.method.enum";
import { ONBOARDING_KEYS, ONBOARDING_PERCENTAGE } from "../../../../utils/constantFiles/OnBoarding.keys";
import { areAllPendingFieldsEmpty } from "../../user.controller";
import { CARD_DETAILS } from "../../../../utils/constantFiles/signupFields";
import { userHasAccess } from "../../../../utils/userHasAccess";
import { MODULE, PERMISSIONS } from "../../../../utils/Enums/permissions.enum";
import { TransactionInterface } from "../../../../types/TransactionInterface";
import { PAYMENT_STATUS } from "../../../../utils/Enums/payment.status";
import { transactionTitle } from "../../../../utils/Enums/transaction.title.enum";
import { Transaction } from "../../../Models/Transaction";
import logger from "../../../../utils/winstonLogger/logger";
import { generatePDF, generatePDFParams } from "../../../../utils/XeroApiIntegration/generatePDF";
import { AxiosResponse } from "axios";
import { XeroResponseInterface } from "../../../../types/XeroResponseInterface";
import { InvoiceInterface } from "../../../../types/InvoiceInterface";
import { Invoice } from "../../../Models/Invoice";
import { refreshToken } from "../../../../utils/XeroApiIntegration/createContact";
import { CardDetails } from "../../../Models/CardDetails";
import mongoose from "mongoose";
import { PostcodeWebhookParams, eventsWebhook } from "../../../../utils/webhookUrls/eventExpansionWebhook";
import { EVENT_TITLE } from "../../../../utils/constantFiles/events";
import { UserLeadsDetails } from "../../../Models/UserLeadsDetails";
import { UserLeadsDetailsInterface } from "../../../../types/LeadDetailsInterface";
import { arraysAreEqual } from "../../../../utils/Functions/postCodeMatch";
import { POSTCODE_TYPE } from "../../../../utils/Enums/postcode.enum";
import { flattenPostalCodes } from "../../../../utils/Functions/flattenPostcodes";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import { createSessionUnScheduledPayment } from "../../../../utils/payment/createPaymentToRYFT";
import { countryCurrency } from "../../../../utils/constantFiles/currencyConstants";
import { sendEmailForUpdatedDetails } from "../../../Middlewares/mail";
import { findUpdatedFields } from "../../../../utils/Functions/findModifiedColumns";
import { ACTION } from "../../../../utils/Enums/actionType.enum";
import { MODEL_ENUM } from "../../../../utils/Enums/model.enum";
import { ActivityLogs } from "../../../Models/ActivityLogs";
import { cmsUpdateBuyerWebhook } from "../../../../utils/webhookUrls/cmsUpdateBuyerWebhook";

export const updateAction = async (req: Request, res: Response): Promise<any> => {
    let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
    const { id } = req.params;
    const input = req.body;
    const checkUser =
      (await User.findById(id)
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")) ?? ({} as UserInterface);
    if (input.password) {
      delete input.password;
    }
    if (!checkUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    let dataToUpdate: { [key: string]: any } = {};

    if (
      checkUser.role === RolesEnum.ACCOUNT_ADMIN &&
      input.isAccountAdmin === false
    ) {
      dataToUpdate = {
        ...dataToUpdate,
        role: RolesEnum.ADMIN,
        isAccountAdmin: false,
      };
    }

    if (input.isAccountAdmin) {
      dataToUpdate = {
        ...dataToUpdate,
        role: RolesEnum.ACCOUNT_ADMIN,
        isAccountAdmin: true,
      };
    }
    const newRolePermissions: PermissionInterface | null =
      await Permissions.findOne({
        role: dataToUpdate.role,
      });

    if (newRolePermissions) {
      dataToUpdate.permissions = newRolePermissions.permissions;
    }
    await User.findByIdAndUpdate(checkUser.id, dataToUpdate, { new: true });

    if (input.credits && user.role == RolesEnum.USER) {
      delete input.credits;
    }

    if (user.role === RolesEnum.USER && (input.email || input.email == "")) {
      input.email = user?.email;
    }
    if (user.role === RolesEnum.SUPER_ADMIN && input.email) {
      const email = await User.findOne({
        email: input.email,
        isDeleted: false,
      });
      if (email && checkUser.email != email.email) {
        return res.status(400).json({
          error: {
            message: "Email already registered with another user",
          },
        });
      }
    }

    try {
      const businesBeforeUpdate = await BusinessDetails.findById(
        checkUser?.businessDetailsId
      );
      const userForActivity = await User.findById(
        id,
        " -__v -_id -businessDetailsId -businessIndustryId -userLeadsDetailsId -userServiceId -accountManager -onBoarding -createdAt -updatedAt -password"
      ).lean();
      if (
        input.paymentMethod === paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
        user?.role === RolesEnum.USER
      ) {
        return res.status(403).json({
          error: {
            message:
              "Please contact admin to request for weekly payment method",
          },
        });
      }
      if (
        (input.buyerId ||
          input.leadCost ||
          input.ryftClientId ||
          input.xeroContactId ||
          input.role) &&
        user?.role == RolesEnum.USER
      ) {
        return res
          .status(403)
          .json({ error: { message: "Please contact admin to update." } });
      }
      if (
        input.paymentMethod &&
        checkUser?.paymentMethod == paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
        user?.role === RolesEnum.USER
      ) {
        return res.status(403).json({
          error: { message: "Please contact admin to change payment method" },
        });
      }

      if (
        input.isCreditsAndBillingEnabled === false &&
        checkUser?.role === RolesEnum.USER
      ) {
        let object = checkUser.onBoarding;
        object.map((fields) => {
          if (fields.key === ONBOARDING_KEYS.CARD_DETAILS) {
            fields.pendingFields = [];
          }
        });
        await User.findByIdAndUpdate(checkUser?.id, {
          isCreditsAndBillingEnabled: false,
          onBoarding: object,
        });
      }
      if (
        input.isCreditsAndBillingEnabled === true &&
        checkUser?.role === RolesEnum.NON_BILLABLE
      ) {
        let object = checkUser.onBoarding;

        if (!areAllPendingFieldsEmpty(object)) {
          object.map((fields) => {
            if (fields.key === ONBOARDING_KEYS.CARD_DETAILS) {
              fields.pendingFields = [CARD_DETAILS.CARD_NUMBER];
            }
          });
          await User.findByIdAndUpdate(checkUser?.id, {
            isCreditsAndBillingEnabled: false,
            onBoarding: object,
          });
        }
      }

      if (
        (input.secondaryLeadCost && !input.secondaryLeads) ||
        (!input.secondaryLeadCost && input.secondaryLeads)
      ) {
        return res.status(400).json({
          error: {
            message: "Please enter secondary leads and secondary lead cost",
          },
        });
      }
      let secondaryLeadsAnticipating: number;
      let canUpdateClient = await userHasAccess(user, [{ module: MODULE.CLIENTS, permission: PERMISSIONS.UPDATE }]);
      if (input.secondaryLeads && canUpdateClient) {
        secondaryLeadsAnticipating =
          input.secondaryLeads * input.secondaryLeadCost;
        let dataSave = {
          secondaryLeadCost: input.secondaryLeadCost,
          secondaryCredits: secondaryLeadsAnticipating,
          isSecondaryUsage: true,
          secondaryLeads: input.secondaryLeads,
        };

        if (
          input?.secondaryLeadCost &&
          secondaryLeadsAnticipating < input?.secondaryLeadCost
        ) {
          dataSave.isSecondaryUsage = false;
        }
        await User.findByIdAndUpdate(checkUser?.id, dataSave, {
          new: true,
        });

        let dataToSave: Partial<TransactionInterface> = {
          userId: checkUser.id,
          amount: secondaryLeadsAnticipating,
          status: PAYMENT_STATUS.CAPTURED,
          title: transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT,
          isCredited: true,
          creditsLeft: secondaryLeadsAnticipating,
        };
        // if (user?.credits < credits) {
        let transaction = await Transaction.create(dataToSave);
        logger.info(
          "transaction",
          { transaction }
        );
        const paramPdf: generatePDFParams = {
          ContactID: checkUser?.xeroContactId,
          desc: transactionTitle.CREDITS_ADDED,
          amount: secondaryLeadsAnticipating,
          freeCredits: 0,
          sessionId: transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT,
          isManualAdjustment: false,
        };
        if (input.generateInvoice) {
          generatePDF(paramPdf)
            .then(async (res: AxiosResponse<XeroResponseInterface>) => {
              const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                userId: checkUser?.id,
                transactionId: transaction.id,
                price: secondaryLeadsAnticipating,
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
                  ContactID: checkUser?.xeroContactId,
                  desc: transactionTitle.CREDITS_ADDED,
                  amount: secondaryLeadsAnticipating,
                  freeCredits: 0,
                  sessionId: transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT,
                  isManualAdjustment: false,
                };
                generatePDF(paramPdf).then(async (res: AxiosResponse<XeroResponseInterface>) => {
                  const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                    userId: checkUser?.id,
                    transactionId: transaction.id,
                    price: secondaryLeadsAnticipating,
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
      }

      if (input.smsPhoneNumber) {
        const userExist = await User.findOne({
          smsPhoneNumber: input.smsPhoneNumber,
        });

        if (
          userExist &&
          // @ts-ignore
          userExist.id !== req?.user?.id &&
          userExist.role !== RolesEnum.SUPER_ADMIN &&
          !userExist?.isDeleted
        ) {
          return res.status(400).json({
            error: {
              message:
                "This Number is already registered with another account.",
            },
          });
        }
      }

      if (!checkUser) {
        return res
          .status(404)
          .json({ error: { message: "User to update does not exists." } });
      }

      const cardExist = await CardDetails.findOne({
        userId: checkUser?._id,
        isDefault: true,
        isDeleted: false,
      });

      if (
        !cardExist &&
        input.credits &&
        (user.role == RolesEnum.USER ||
          user.role == RolesEnum.ADMIN ||
          user.role == RolesEnum.SUPER_ADMIN)
      ) {
        return res
          .status(404)
          .json({ error: { message: "Card Details not found!" } });
      }
      if (input.businessName) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        const businesses = await BusinessDetails.find({
          businessName: input.businessName,
          isDeleted: false,
        });
        if (businesses.length > 0) {
          let array: mongoose.Types.ObjectId[] = [];
          businesses.map((business) => {
            array.push(business._id);
          });
          const businessDetailsIdInString =
            checkUser?.businessDetailsId.toString();

          const ids = array.some(
            (item) => item.toString() === businessDetailsIdInString
          );

          if (!ids) {
            return res
              .status(400)
              .json({ error: { message: "Business Name Already Exists." } });
          }
        }

        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessName: input.businessName },

          { new: true }
        );
      }
      if (input.businessAddress) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }

        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessAddress: input.businessAddress },

          { new: true }
        );
      }
      if (
        input.businessSalesNumber &&
        checkUser?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
      ) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }

        const details = await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessSalesNumber: input.businessSalesNumber },

          { new: true }
        );
        let reqBody: PostcodeWebhookParams = {
          userId: checkUser?._id,
          bid: checkUser?.buyerId,
          businessName: details?.businessName,
          businessSalesNumber: input.businessSalesNumber,
          eventCode: EVENT_TITLE.BUSINESS_PHONE_NUMBER,
        };
        await eventsWebhook(reqBody)
          .then((res) =>
            logger.info(
              "event webhook for updating business phone number hits successfully.",
              { reqBody }
            )
          )
          .catch((err) =>
            logger.error(
              "error while triggering business phone number webhooks failed",
              err
            )
          );
      }

      if (input.businessCity) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessCity: input.businessCity },

          { new: true }
        );
      }
      if (input.businessCountry) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessCountry: input.businessCountry },

          { new: true }
        );
      }
      if (input.businessPostCode) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessPostCode: input.businessPostCode },

          { new: true }
        );
      }
      if (input.businessIndustry) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessIndustry: input.businessIndustry },

          { new: true }
        );
      }
      if (input.businessOpeningHours) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessOpeningHours: input.businessOpeningHours },

          { new: true }
        );
      }
      if (input.total) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { total: input.total },

          { new: true }
        );
      }
      if (input.weekly) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { weekly: input.weekly },

          { new: true }
        );
      }
      if (input.monthly) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { monthly: input.monthly },

          { new: true }
        );
      }
      if (input.leadSchedule) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        const userBeforeMod =
          (await UserLeadsDetails.findById(checkUser?.userLeadsDetailsId)) ??
          ({} as UserLeadsDetailsInterface);

        const userAfterMod =
          (await UserLeadsDetails.findByIdAndUpdate(
            checkUser?.userLeadsDetailsId,
            { leadSchedule: input.leadSchedule },

            { new: true }
          )) ?? ({} as UserLeadsDetailsInterface);
        const business = await BusinessDetails.findById(
          checkUser.businessDetailsId
        );

        if (
          input.leadSchedule &&
          !arraysAreEqual(input.leadSchedule, userBeforeMod?.leadSchedule) &&
          user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
        ) {
          let paramsToSend: PostcodeWebhookParams = {
            userId: checkUser?._id,
            buyerId: checkUser?.buyerId,
            businessName: business?.businessName,
            eventCode: EVENT_TITLE.LEAD_SCHEDULE_UPDATE,
            leadSchedule: userAfterMod?.leadSchedule,
          };
          if (userAfterMod.type === POSTCODE_TYPE.RADIUS) {
            (paramsToSend.type = POSTCODE_TYPE.RADIUS),
              (paramsToSend.postcode = userAfterMod.postCodeList);
          } else {
            paramsToSend.postCodeList = flattenPostalCodes(
              userAfterMod?.postCodeTargettingList
            );
          }
          await eventsWebhook(paramsToSend)
            .then((res) =>
              logger.info(
                "event webhook for postcode updates hits successfully.",
                { paramsToSend }
              )
            )
            .catch((err) =>
              logger.error(
                "error while triggering postcode updates webhooks failed",
                err
              )
            );
        }
      }
      if (input.postCodeTargettingList) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { postCodeTargettingList: input.postCodeTargettingList },

          { new: true }
        );
      }
      if (input.leadAlertsFrequency) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { leadAlertsFrequency: input.leadAlertsFrequency },

          { new: true }
        );
      }
      if (input.zapierUrl) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }

        const industry = await BuisnessIndustries.findById(
          checkUser.businessIndustryId
        );
        const columns = industry?.columns;

        const result: { [key: string]: string } = {};
        if (columns) {
          for (const item of columns) {
            if (item.isVisible === true) {
              //@ts-ignore
              result[item.originalName] = item.displayName;
            }
          }
        }

        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { zapierUrl: input.zapierUrl, sendDataToZapier: true },

          { new: true }
        );
      }
      if (input.daily) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        input.daily = parseInt(input.daily);
        const business = await BusinessDetails.findById(
          checkUser.businessDetailsId
        );
        const userBeforeMod =
          (await UserLeadsDetails.findById(checkUser?.userLeadsDetailsId)) ??
          ({} as UserLeadsDetailsInterface);
        const userAfterMod =
          (await UserLeadsDetails.findByIdAndUpdate(
            checkUser?.userLeadsDetailsId,
            { daily: input.daily },

            { new: true }
          )) ?? ({} as UserLeadsDetailsInterface);
        if (
          input.daily != userBeforeMod?.daily &&
          user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
        ) {
          let paramsToSend: PostcodeWebhookParams = {
            userId: checkUser?._id,
            buyerId: checkUser?.buyerId,
            businessName: business?.businessName,
            eventCode: EVENT_TITLE.DAILY_LEAD_CAP,

            dailyLeadCap: userAfterMod?.daily,
          };
          if (userAfterMod.type === POSTCODE_TYPE.RADIUS) {
            (paramsToSend.type = POSTCODE_TYPE.RADIUS),
              (paramsToSend.postcode = userAfterMod.postCodeList);
          } else {
            paramsToSend.postCodeList = flattenPostalCodes(
              userAfterMod?.postCodeTargettingList
            );
          }

          await eventsWebhook(paramsToSend)
            .then(() =>
              logger.info(
                "event webhook for postcode updates hits successfully.",
                { paramsToSend }
              )
            )
            .catch((err) =>
              logger.error(
                "error while triggering postcode updates webhooks failed",
                err
              )
            );
        }
      }
      if (
        input.credits &&
        (user.role == RolesEnum.ADMIN ||
          // @ts-ignore
          user.role == RolesEnum.SUPER_ADMIN)
      ) {
        const params: any = {
          fixedAmount: input.credits,
          email: checkUser?.email,
          cardNumber: cardExist?.cardNumber,
          buyerId: checkUser?.buyerId,
          clientId: checkUser.ryftClientId,
          cardId: cardExist?.id,
        };

        createSessionUnScheduledPayment(params)
          .then(async (_res: any) => {
            if (!checkUser.xeroContactId) {
              logger.info(
                "xeroContact ID not found. Failed to generate pdf.",
                { _res }
              );
            }
            const dataToSave: any = {
              userId: checkUser?.id,
              cardId: cardExist?.id,
              amount: input.credits,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "success",
              creditsLeft: checkUser?.credits + input.credits,
            };

            const transaction = await Transaction.create(dataToSave);
            if (checkUser?.xeroContactId) {
              const paramPdf: generatePDFParams = {
                ContactID: checkUser?.xeroContactId,
                desc: transactionTitle.CREDITS_ADDED,
                amount: input?.credits,
                freeCredits: 0,
                sessionId: _res.data.id,
                isManualAdjustment: false,
              };
              generatePDF(paramPdf)
                .then(async (res: AxiosResponse<XeroResponseInterface>) => {
                  const dataToSaveInInvoice: any = {
                    userId: checkUser?.id,
                    transactionId: transaction.id,
                    price: input.credits,
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
                      ContactID: checkUser?.xeroContactId,
                      desc: transactionTitle.CREDITS_ADDED,
                      amount: input.credits,
                      freeCredits: 0,
                      sessionId: _res.data.id,
                      isManualAdjustment: false,
                    };
                    generatePDF(paramPdf).then(async (res: AxiosResponse<XeroResponseInterface>) => {
                      const dataToSaveInInvoice: any = {
                        userId: checkUser?.id,
                        transactionId: transaction.id,
                        price: input.credits,
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

            logger.info(
              "payment success!!!!!!!!!!!!!",
              { _res }
            );

            await User.findByIdAndUpdate(
              id,
              {
                ...input,
                credits: checkUser.credits + input.credits,
              },
              {
                new: true,
              }
            );
          })
          .catch(async (err) => {
            // sendEmailForFailedAutocharge(i.email, subject, text);
            const dataToSave: any = {
              userId: checkUser?.id,
              cardId: cardExist?.id,
              amount: input.credits,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "error",
              creditsLeft: checkUser?.credits,
            };
            await Transaction.create(dataToSave);
            logger.error(
              "error in payment Api",
              err
            );
          });
      } else {
        const user = await User.findByIdAndUpdate(
          id,
          {
            ...input,
          },
          {
            new: true,
          }
        );

        if (!user) {
          return res
            .status(404)
            .json({ error: { message: "User to update does not exists." } });
        }

        // const result = await User.findById(id, "-password -__v");
        const userData = await User.findById(id, "-password -__v");

        const buinessData = await BusinessDetails.findById(
          userData?.businessDetailsId
        );
        const leadData = await UserLeadsDetails.findById(
          userData?.userLeadsDetailsId
        );

        // const formattedPostCodes = leadData?.postCodeTargettingList
        //   .map((item: any) => item.postalCode)
        //   .flat();
        let formattedPostCodes ;
        if (leadData && leadData.type === POSTCODE_TYPE.RADIUS) {
          (formattedPostCodes = leadData.postCodeList?.map(({postcode}) => {
            return postcode
          }));
        } else {
          formattedPostCodes = leadData?.postCodeTargettingList
            .map((item: any) => item.postalCode)
            .flat();
        }
        const userAfterMod = await User.findById(
          id,
          "-__v -_id -businessDetailsId -businessIndustryId -userServiceId -accountManager -userLeadsDetailsId -onBoarding -createdAt -updatedAt -password"
        ).lean();

        const currencyObj = countryCurrency.find(
          ({ country, value }) =>
            country === user?.country && value === user?.currency
        );

        const originalDailyLimit = leadData?.daily ?? 0;

        const fiftyPercentVariance = Math.round(
          originalDailyLimit + 0.5 * originalDailyLimit
        );


        const message = {
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          businessName: buinessData?.businessName,
          phone: buinessData?.businessSalesNumber,
          email: userData?.email,
          industry: buinessData?.businessIndustry,
          address: buinessData?.address1 + " " + buinessData?.address2,
          city: buinessData?.businessCity,
          country: buinessData?.businessCountry,
          openingHours: buinessData?.businessOpeningHours,
          logo: buinessData?.businessLogo,
          // openingHours:formattedOpeningHours,
          totalLeads: leadData?.total,
          monthlyLeads: leadData?.monthly,
          weeklyLeads: leadData?.weekly,
          dailyLeads: leadData?.daily,
          // leadsHours:formattedLeadSchedule,
          leadsHours: leadData?.leadSchedule,
          area: `${formattedPostCodes}`,
          leadCost: user?.leadCost,
          currencyCode: currencyObj?.symbol,
          mobilePrefixCode: userData?.mobilePrefixCode,
          dailyCap: fiftyPercentVariance
        };

        sendEmailForUpdatedDetails(message);

        const fields = findUpdatedFields(userForActivity, userAfterMod);
        const isEmpty = Object.keys(fields.updatedFields).length === 0;

        if (!isEmpty && user?.isSignUpCompleteWithCredit) {
          const activity = {
            actionBy: user?.role,
            actionType: ACTION.UPDATING,
            targetModel: MODEL_ENUM.USER,
            userEntity: req.params.id,
            originalValues: fields.oldFields,
            modifiedValues: fields.updatedFields,
          };
          await ActivityLogs.create(activity);
        }

        if (input.triggerAmount || input.autoChargeAmount) {
          return res.json({
            message: "Auto Top-Up Settings Updated Successfully",
            data: userData,
          });
        }
        if (input.isSmsNotificationActive || input.smsPhoneNumber) {
          return res.json({
            message: "SMS Settings Saved Successfully",
            data: userData,
          });
        } else if (input.paymentMethod) {
          return res.json({
            message: "Updated Successfully",
            data: userData,
          });
        } else {
          if (
            input.businessIndustry ||
            input.businessName ||
            input.businessLogo ||
            input.address1 ||
            input.address2 ||
            input.businessSalesNumber ||
            input.businessCountry ||
            input.businessPostCode ||
            input.businessOpeningHours
          ) {
            const businesAfterUpdate = await BusinessDetails.findById(
              checkUser.businessDetailsId,
              " -_id  -createdAt -updatedAt"
            ).lean();

            const fields = findUpdatedFields(
              businesBeforeUpdate,
              businesAfterUpdate
            );

            const isEmpty = Object.keys(fields.updatedFields).length === 0;
            if (!isEmpty && user?.isSignUpCompleteWithCredit) {
              const activity = {
                actionBy: user?.role,
                actionType: ACTION.UPDATING,
                targetModel: MODEL_ENUM.BUSINESS_DETAILS,
                userEntity: checkUser?.id,
                originalValues: fields.oldFields,
                modifiedValues: fields.updatedFields,
              };
              await ActivityLogs.create(activity);
            }
          }
          cmsUpdateBuyerWebhook(id, cardExist?.id);

          return res.json({ message: "Updated Successfully", data: userData });
        }
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };
