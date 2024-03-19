import {AxiosResponse} from "axios";
import {Request, Response} from "express"
import mongoose from "mongoose";
import {isBusinessObject} from "../../../../types/BusinessInterface";
import {CreditAndBillingToggleWebhookParams} from "../../../../types/CreditAndBillingToggleWebhookParams";
import {PostcodeWebhookParams} from "types/postcodeWebhookParams";
import {InvoiceInterface} from "../../../../types/InvoiceInterface";
import {UserLeadsDetailsInterface} from "../../../../types/LeadDetailsInterface";
import {PermissionInterface} from "../../../../types/PermissionsInterface";
import {RolesEnum} from "../../../../types/RolesEnum";
import {TransactionInterface} from "../../../../types/TransactionInterface";
import {UserInterface} from "../../../../types/UserInterface";
import {XeroResponseInterface} from "../../../../types/XeroResponseInterface";
import {countryCurrency} from "../../../../utils/constantFiles/currencyConstants";
import {EVENT_TITLE} from "../../../../utils/constantFiles/events";
import {ONBOARDING_KEYS, ONBOARDING_PERCENTAGE} from "../../../../utils/constantFiles/OnBoarding.keys";
import {CARD_DETAILS} from "../../../../utils/constantFiles/signupFields";
import {ACTION} from "../../../../utils/Enums/actionType.enum";
import {MODEL_ENUM} from "../../../../utils/Enums/model.enum";
import {paymentMethodEnum} from "../../../../utils/Enums/payment.method.enum";
import {PAYMENT_STATUS} from "../../../../utils/Enums/payment.status";
import {MODULE, PERMISSIONS} from "../../../../utils/Enums/permissions.enum";
import {POSTCODE_TYPE} from "../../../../utils/Enums/postcode.enum";
import {transactionTitle} from "../../../../utils/Enums/transaction.title.enum";
import {findUpdatedFields} from "../../../../utils/Functions/findModifiedColumns";
import {flattenPostalCodes} from "../../../../utils/Functions/flattenPostcodes";
import {arraysAreEqual} from "../../../../utils/Functions/postCodeMatch";
import {createSessionUnScheduledPayment} from "../../../../utils/payment/createPaymentToRYFT";
import {userHasAccess} from "../../../../utils/userHasAccess";
import {cmsUpdateBuyerWebhook} from "../../../../utils/webhookUrls/cmsUpdateBuyerWebhook";
import {eventsWebhook} from "../../../../utils/webhookUrls/eventExpansionWebhook";
import logger from "../../../../utils/winstonLogger/logger";
import {refreshToken} from "../../../../utils/XeroApiIntegration/createContact";
import {generatePDF, generatePDFParams} from "../../../../utils/XeroApiIntegration/generatePDF";
import {sendEmailForUpdatedDetails} from "../../../Middlewares/mail";
import {ActivityLogs} from "../../../Models/ActivityLogs";
import {BuisnessIndustries} from "../../../Models/BuisnessIndustries";
import {BusinessDetails} from "../../../Models/BusinessDetails";
import {CardDetails} from "../../../Models/CardDetails";
import {Invoice} from "../../../Models/Invoice";
import {Permissions} from "../../../Models/Permission";
import {Transaction} from "../../../Models/Transaction";
import {User} from "../../../Models/User";
import {UserLeadsDetails} from "../../../Models/UserLeadsDetails";
import {areAllPendingFieldsEmpty} from "../../user.controller";

export const updateAction = async (req: Request, res: Response): Promise<any> => {
  let requestUser: Partial<UserInterface> = req.user ?? ({} as UserInterface);
  const {id} = req.params;
  const input = req.body;

  const targetUser =
    (
      await User.findById(id)
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")
        .lean(true)
    ) ?? ({} as UserInterface);


  if (input.password) {
    delete input.password;
  }

  if (input.isAutoChargeEnabled !== undefined && input.isAutoChargeEnabled !== null) {
    const reqBody: CreditAndBillingToggleWebhookParams = {
      userId: targetUser?._id,
      bid: targetUser?.buyerId,
      isAutoChargeEnabled: input.isAutoChargeEnabled,
      businessName: (isBusinessObject(targetUser?.businessDetailsId)) ? targetUser?.businessDetailsId?.businessName : '',
      businessSalesNumber: (isBusinessObject(targetUser?.businessDetailsId)) ? targetUser?.businessDetailsId?.businessSalesNumber : '',
      eventCode: EVENT_TITLE.USER_AUTO_CHARGE_UPDATE,
    };

    await eventsWebhook(reqBody)
      .then((res) =>
        logger.info(
          "event webhook for updating business phone number hits successfully.",
          {reqBody}
        )
      )
      .catch((err) =>
        logger.error(
          "error while triggering business phone number webhooks failed",
          err
        )
      );

  }

  if (!targetUser) {
    return res
      .status(404)
      .json({success: false, message: "User not found."});
  }

  let dataToUpdate: { [key: string]: any } = {};

  if (
    targetUser.role === RolesEnum.ACCOUNT_ADMIN &&
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
  await User.findByIdAndUpdate(targetUser.id, dataToUpdate, {new: true});

  if (input.credits && requestUser.role == RolesEnum.USER) {
    delete input.credits;
  }

  if (requestUser.role === RolesEnum.USER && (input.email || input.email == "")) {
    input.email = requestUser?.email;
  }
  if (requestUser.role === RolesEnum.SUPER_ADMIN && input.email) {
    const email = await User.findOne({
      email: input.email,
      isDeleted: false,
    });
    if (email && targetUser.email != email.email) {
      return res.status(400).json({
        error: {
          message: "Email already registered with another user",
        },
      });
    }
  }

  try {
    const businessBeforeUpdate = await BusinessDetails.findById(
      targetUser?.businessDetailsId
    );
    const userForActivity = await User.findById(
      id,
      " -__v -_id -businessDetailsId -businessIndustryId -userLeadsDetailsId -userServiceId -accountManager -onBoarding -createdAt -updatedAt -password"
    ).lean();
    if (
      input.paymentMethod === paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
      requestUser?.role === RolesEnum.USER
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
      requestUser?.role == RolesEnum.USER
    ) {
      return res
        .status(403)
        .json({error: {message: "Please contact admin to update."}});
    }
    if (
      input.paymentMethod &&
      targetUser?.paymentMethod == paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
      requestUser?.role === RolesEnum.USER
    ) {
      return res.status(403).json({
        error: {message: "Please contact admin to change payment method"},
      });
    }

    if (
      input.isCreditsAndBillingEnabled === false &&
      targetUser?.role === RolesEnum.USER
    ) {
      let object = targetUser.onBoarding;
      object.map((fields) => {
        if (fields.key === ONBOARDING_KEYS.CARD_DETAILS) {
          fields.pendingFields = [];
        }
      });
      await User.findByIdAndUpdate(targetUser?.id, {
        isCreditsAndBillingEnabled: false,
        onBoarding: object,
      });
    }

    if (
      input.isCreditsAndBillingEnabled === true &&
      targetUser?.role === RolesEnum.NON_BILLABLE
    ) {
      let object = targetUser.onBoarding;

      if (!areAllPendingFieldsEmpty(object)) {
        object.map((fields) => {
          if (fields.key === ONBOARDING_KEYS.CARD_DETAILS) {
            fields.pendingFields = [CARD_DETAILS.CARD_NUMBER];
          }
        });
        await User.findByIdAndUpdate(targetUser?.id, {
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
    let canUpdateClient = await userHasAccess(requestUser, [{module: MODULE.CLIENTS, permission: PERMISSIONS.UPDATE}]);
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
      await User.findByIdAndUpdate(targetUser?.id, dataSave, {
        new: true,
      });

      let dataToSave: Partial<TransactionInterface> = {
        userId: targetUser.id,
        leadCost: targetUser?.leadCost,
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
        {transaction}
      );
      const paramPdf: generatePDFParams = {
        ContactID: targetUser?.xeroContactId,
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
              userId: targetUser?.id,
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
              {res}
            );
          })
          .catch(async (err) => {
            refreshToken().then(async (res) => {
              const paramPdf: generatePDFParams = {
                ContactID: targetUser?.xeroContactId,
                desc: transactionTitle.CREDITS_ADDED,
                amount: secondaryLeadsAnticipating,
                freeCredits: 0,
                sessionId: transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT,
                isManualAdjustment: false,
              };
              generatePDF(paramPdf).then(async (res: AxiosResponse<XeroResponseInterface>) => {
                const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                  userId: targetUser?.id,
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
                  {res}
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

    if (!targetUser) {
      return res
        .status(404)
        .json({error: {message: "User to update does not exists."}});
    }

    const cardExist = await CardDetails.findOne({
      userId: targetUser?._id,
      isDefault: true,
      isDeleted: false,
    });

    if (
      !cardExist &&
      input.credits &&
      (requestUser.role == RolesEnum.USER ||
        requestUser.role == RolesEnum.ADMIN ||
        requestUser.role == RolesEnum.SUPER_ADMIN)
    ) {
      return res
        .status(404)
        .json({error: {message: "Card Details not found!"}});
    }
    if (input.businessName) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
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
          targetUser?.businessDetailsId.toString();

        const ids = array.some(
          (item) => item.toString() === businessDetailsIdInString
        );

        if (!ids) {
          return res
            .status(400)
            .json({error: {message: "Business Name Already Exists."}});
        }
      }

      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessName: input.businessName},

        {new: true}
      );
    }
    if (input.businessAddress) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }

      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessAddress: input.businessAddress},

        {new: true}
      );
    }
    if (input.businessUrl) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }

      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessUrl: input.businessUrl},

        {new: true}
      );
    }
    if (
      input.businessSalesNumber &&
      targetUser?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
    ) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }

      const details = await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessSalesNumber: input.businessSalesNumber},

        {new: true}
      );
      const reqBody: PostcodeWebhookParams = {
        userId: targetUser?._id,
        bid: targetUser?.buyerId,
        businessName: details?.businessName,
        businessSalesNumber: input.businessSalesNumber,
        eventCode: EVENT_TITLE.BUSINESS_PHONE_NUMBER,
      };
      await eventsWebhook(reqBody)
        .then((res) =>
          logger.info(
            "event webhook for updating business phone number hits successfully.",
            {reqBody}
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
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }
      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessCity: input.businessCity},

        {new: true}
      );
    }
    if (input.businessCountry) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }
      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessCountry: input.businessCountry},

        {new: true}
      );
    }
    if (input.businessPostCode) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }
      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessPostCode: input.businessPostCode},

        {new: true}
      );
    }
    if (input.businessIndustry) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }
      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessIndustry: input.businessIndustry},

        {new: true}
      );
    }
    if (input.businessOpeningHours) {
      if (!targetUser.businessDetailsId) {
        return res
          .status(404)
          .json({error: {message: "business details not found"}});
      }
      await BusinessDetails.findByIdAndUpdate(
        targetUser?.businessDetailsId,
        {businessOpeningHours: input.businessOpeningHours},

        {new: true}
      );
    }
    if (input.total) {
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }
      await UserLeadsDetails.findByIdAndUpdate(
        targetUser?.userLeadsDetailsId,
        {total: input.total},

        {new: true}
      );
    }
    if (input.weekly) {
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }
      await UserLeadsDetails.findByIdAndUpdate(
        targetUser?.userLeadsDetailsId,
        {weekly: input.weekly},

        {new: true}
      );
    }
    if (input.monthly) {
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }
      await UserLeadsDetails.findByIdAndUpdate(
        targetUser?.userLeadsDetailsId,
        {monthly: input.monthly},

        {new: true}
      );
    }
    if (input.leadSchedule) {
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }
      const userBeforeMod =
        (await UserLeadsDetails.findById(targetUser?.userLeadsDetailsId)) ??
        ({} as UserLeadsDetailsInterface);

      const userAfterMod =
        (await UserLeadsDetails.findByIdAndUpdate(
          targetUser?.userLeadsDetailsId,
          {leadSchedule: input.leadSchedule},

          {new: true}
        )) ?? ({} as UserLeadsDetailsInterface);
      const business = await BusinessDetails.findById(
        targetUser.businessDetailsId
      );

      if (
        input.leadSchedule &&
        !arraysAreEqual(input.leadSchedule, userBeforeMod?.leadSchedule) &&
        requestUser?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
      ) {
        let paramsToSend: PostcodeWebhookParams = {
          userId: targetUser?._id,
          buyerId: targetUser?.buyerId,
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
              {paramsToSend}
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
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }
      await UserLeadsDetails.findByIdAndUpdate(
        targetUser?.userLeadsDetailsId,
        {postCodeTargettingList: input.postCodeTargettingList},

        {new: true}
      );
    }
    if (input.leadAlertsFrequency) {
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }
      await UserLeadsDetails.findByIdAndUpdate(
        targetUser?.userLeadsDetailsId,
        {leadAlertsFrequency: input.leadAlertsFrequency},

        {new: true}
      );
    }
    if (input.zapierUrl) {
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }

      const industry = await BuisnessIndustries.findById(
        targetUser.businessIndustryId
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
        targetUser?.userLeadsDetailsId,
        {zapierUrl: input.zapierUrl, sendDataToZapier: true},

        {new: true}
      );
    }
    if (input.daily) {
      if (!targetUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({error: {message: "lead details not found"}});
      }
      input.daily = parseInt(input.daily);
      const business = await BusinessDetails.findById(
        targetUser.businessDetailsId
      );
      const userBeforeMod =
        (await UserLeadsDetails.findById(targetUser?.userLeadsDetailsId)) ??
        ({} as UserLeadsDetailsInterface);
      const userAfterMod =
        (await UserLeadsDetails.findByIdAndUpdate(
          targetUser?.userLeadsDetailsId,
          {daily: input.daily},

          {new: true}
        )) ?? ({} as UserLeadsDetailsInterface);
      if (
        input.daily != userBeforeMod?.daily &&
        requestUser?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
      ) {
        let paramsToSend: PostcodeWebhookParams = {
          userId: targetUser?._id,
          buyerId: targetUser?.buyerId,
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
              {paramsToSend}
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
      (requestUser.role == RolesEnum.ADMIN ||
        // @ts-ignore
        requestUser.role == RolesEnum.SUPER_ADMIN)
    ) {
      const params: any = {
        fixedAmount: input.credits,
        email: targetUser?.email,
        cardNumber: cardExist?.cardNumber,
        buyerId: targetUser?.buyerId,
        clientId: targetUser.ryftClientId,
        cardId: cardExist?.id,
      };

      createSessionUnScheduledPayment(params)
        .then(async (_res: any) => {
          if (!targetUser.xeroContactId) {
            logger.info(
              "xeroContact ID not found. Failed to generate pdf.",
              {_res}
            );
          }
          const dataToSave: any = {
            userId: targetUser?.id,
            leadCost: targetUser?.leadCost,
            cardId: cardExist?.id,
            amount: input.credits,
            title: transactionTitle.CREDITS_ADDED,
            isCredited: true,
            status: "success",
            creditsLeft: targetUser?.credits + input.credits,
          };

          const transaction = await Transaction.create(dataToSave);
          if (targetUser?.xeroContactId) {
            const paramPdf: generatePDFParams = {
              ContactID: targetUser?.xeroContactId,
              desc: transactionTitle.CREDITS_ADDED,
              amount: input?.credits,
              freeCredits: 0,
              sessionId: _res.data.id,
              isManualAdjustment: false,
            };
            generatePDF(paramPdf)
              .then(async (res: AxiosResponse<XeroResponseInterface>) => {
                const dataToSaveInInvoice: any = {
                  userId: targetUser?.id,
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
                  {res}
                );
              })
              .catch(async (err) => {
                refreshToken().then(async (res) => {
                  const paramPdf: generatePDFParams = {
                    ContactID: targetUser?.xeroContactId,
                    desc: transactionTitle.CREDITS_ADDED,
                    amount: input.credits,
                    freeCredits: 0,
                    sessionId: _res.data.id,
                    isManualAdjustment: false,
                  };
                  generatePDF(paramPdf).then(async (res: AxiosResponse<XeroResponseInterface>) => {
                    const dataToSaveInInvoice: any = {
                      userId: targetUser?.id,
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
                      {res}
                    );
                  });
                });
              });
          }

          logger.info(
            "user payment success",
            {_res}
          );

          await User.findByIdAndUpdate(
            id,
            {
              ...input,
              credits: targetUser.credits + input.credits,
            },
            {
              new: true,
            }
          );
        })
        .catch(async (err) => {
          // sendEmailForFailedAutocharge(i.email, subject, text);
          const dataToSave: any = {
            userId: targetUser?.id,
            leadCost: targetUser?.leadCost,
            cardId: cardExist?.id,
            amount: input.credits,
            title: transactionTitle.CREDITS_ADDED,
            isCredited: true,
            status: "error",
            creditsLeft: targetUser?.credits,
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
          .json({error: {message: "User to update does not exists."}});
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
      let formattedPostCodes;
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
        ({country, value}) =>
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
          input.businessUrl ||
          input.businessLogo ||
          input.address1 ||
          input.address2 ||
          input.businessSalesNumber ||
          input.businessCountry ||
          input.businessPostCode ||
          input.businessOpeningHours
        ) {
          const businesAfterUpdate = await BusinessDetails.findById(
            targetUser.businessDetailsId,
            " -_id  -createdAt -updatedAt"
          ).lean();

          const fields = findUpdatedFields(
            businessBeforeUpdate,
            businesAfterUpdate
          );

          const isEmpty = Object.keys(fields.updatedFields).length === 0;
          if (!isEmpty && user?.isSignUpCompleteWithCredit) {
            const activity = {
              actionBy: user?.role,
              actionType: ACTION.UPDATING,
              targetModel: MODEL_ENUM.BUSINESS_DETAILS,
              userEntity: targetUser?.id,
              originalValues: fields.oldFields,
              modifiedValues: fields.updatedFields,
            };
            await ActivityLogs.create(activity);
          }
        }
        cmsUpdateBuyerWebhook(id, cardExist?.id);

        return res.json({message: "Updated Successfully", data: userData});
      }
    }
  } catch (err) {
    return res
      .status(500)
      .json({error: {message: "Something went wrong.", err}});
  }
};
