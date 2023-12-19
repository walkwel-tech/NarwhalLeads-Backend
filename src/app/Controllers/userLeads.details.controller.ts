import { validate } from "class-validator";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
import { checkOnbOardingComplete } from "../../utils/Functions/OnboardingComplete";
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../utils/constantFiles/OnBoarding.keys";
import { UserLeadDetailsInput } from "../Inputs/user.leadDetails.input";
import {
  // sendEmailForNewRegistration,
  sendEmailForUpdatedDetails,
} from "../Middlewares/mail";
import { BusinessDetails } from "../Models/BusinessDetails";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { PROMO_LINK } from "../../utils/Enums/promoLink.enum";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { UserService } from "../Models/UserService";
import { businessDetailsSubmission } from "../../utils/webhookUrls/businessDetailsSubmission";
import { ACTION } from "../../utils/Enums/actionType.enum";
import { MODEL_ENUM } from "../../utils/Enums/model.enum";
import {
  findModifiedFieldsForUserService,
  findUpdatedFields,
} from "../../utils/Functions/findModifiedColumns";
import { ActivityLogs } from "../Models/ActivityLogs";
import { fullySignupForNonBillableClients } from "../../utils/webhookUrls/fullySignupForNonBillableClients";
import { cmsUpdateBuyerWebhook } from "../../utils/webhookUrls/cmsUpdateBuyerWebhook";
import { CardDetails } from "../Models/CardDetails";
import { EVENT_TITLE } from "../../utils/constantFiles/events";
import {
  PostcodeWebhookParams,
  eventsWebhook,
} from "../../utils/webhookUrls/eventExpansionWebhook";
import { UserInterface } from "../../types/UserInterface";
import { flattenPostalCodes } from "../../utils/Functions/flattenPostcodes";
import { UserLeadsDetailsInterface } from "../../types/LeadDetailsInterface";
import { POSTCODE_TYPE } from "../../utils/Enums/postcode.enum";
import { arraysAreEqual } from "../../utils/Functions/postCodeMatch";

export class UserLeadsController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    if (!input.userId) {
      return res
        .status(400)
        .json({ error: { message: "User Id is required" } });
    }
    const leadDetailsInput = new UserLeadDetailsInput();
    (leadDetailsInput.daily = input.daily),
      (leadDetailsInput.leadSchedule = input.leadSchedule);
    // (leadDetailsInput.postCodeTargettingList = input.postCodeTargettingList);

    const errors = await validate(leadDetailsInput);
    const { onBoarding }: any = await User.findById(input.userId);
    let object = onBoarding || [];
    let array: any = [];
    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));
      errorsInfo.map((err) => {
        array.push(err.property);
      });
      const existLead = object.find(
        (item: any) => item.key === ONBOARDING_KEYS.LEAD_DETAILS
      );
      if (existLead) {
        existLead.pendingFields = array;
        object = object.map((obj: any) =>
          obj.key === existLead.key ? existLead : obj
        );
        // object.push(existLead)
      } else {
        const mock = {
          key: ONBOARDING_KEYS.LEAD_DETAILS,
          pendingFields: array,
          dependencies: ["businessIndustry"],
        };
        object.push(mock);
      }
    } else {
      object = object.map((obj: any) =>
        obj.key === ONBOARDING_KEYS.LEAD_DETAILS
          ? (obj = { key: ONBOARDING_KEYS.LEAD_DETAILS, pendingFields: [] })
          : obj
      );
    }
    await User.findByIdAndUpdate(input.userId, { onBoarding: object });
    const serviceData = await UserService.findOne({ userId: input.userId });
    const service = await UserService.findByIdAndUpdate(
      serviceData?.id,
      input,
      { new: true }
    );
    const leadDetails = object.find(
      (item: any) => item.key === ONBOARDING_KEYS.LEAD_DETAILS
    );
    // Find the businessDetails objectect
    const businessDetails = object.find(
      (item: any) => item.key === ONBOARDING_KEYS.BUSINESS_DETAILS
    );

    // if (leadDetails && businessDetails) {
    const leadDependencyFields = leadDetails?.dependencies || [];
    const businessPendingFields = businessDetails?.pendingFields || [];
    const valuesPresent = leadDependencyFields.every((field: any) =>
      businessPendingFields.includes(field)
    );
    if (valuesPresent && leadDependencyFields.length > 0) {
      return res.status(400).json({
        error: {
          message: `${leadDependencyFields} is required to fill the daily LeadCost`,
        },
      });
    }
    // }
    const user: any = await User.findById(input.userId);

    let dataToSave: any = {
      userId: input.userId,
      total: input?.total,
      daily: input?.daily,
      weekly: input?.weekly,
      monthly: input?.monthly,
      leadSchedule: input?.leadSchedule,
      postCodeTargettingList: input?.postCodeTargettingList,
      leadAlertsFrequency: leadsAlertsEnums.INSTANT,
      //@ts-ignore
      dailyLeadCost: input.daily * user?.leadCost,
      miles: input.miles,
      postcode: input.postcode,
      type: input.type,
    };
    try {
      const details = await UserLeadsDetails.create(dataToSave);
      let dataToUpdate = {
        userLeadsDetailsId: details._id,
        onBoardingPercentage: ONBOARDING_PERCENTAGE.LEAD_DETAILS,
      };
      if (user.role === RolesEnum.NON_BILLABLE) {
        dataToUpdate.onBoardingPercentage = ONBOARDING_PERCENTAGE.CARD_DETAILS;
      }
      await User.findByIdAndUpdate(input.userId, dataToUpdate);
      if (
        (checkOnbOardingComplete(user) && !user.registrationMailSentToAdmin) ||
        (user.role === RolesEnum.NON_BILLABLE &&
          !user.isCreditsAndBillingEnabled)
      ) {
        const leadData = await UserLeadsDetails.findOne({ userId: user?._id });
        const businessDeatilsData = await BusinessDetails.findById(
          user?.businessDetailsId
        );
        await User.findByIdAndUpdate(user.id, {
          registrationMailSentToAdmin: true,
        });
        if (
          user.role === RolesEnum.NON_BILLABLE &&
          !user.isCreditsAndBillingEnabled

          // && !user.isUserSignup
        ) {
          await User.findByIdAndUpdate(user.id, {
            isUserSignup: true,
          });
        }
        const messageToSendInBusinessSubmission = {
          businessName: businessDeatilsData?.businessName,
          phone: businessDeatilsData?.businessSalesNumber,
          industry: businessDeatilsData?.businessIndustry,
          address:
            businessDeatilsData?.address1 + " " + businessDeatilsData?.address2,
          city: businessDeatilsData?.businessCity,
          country: businessDeatilsData?.businessCountry,
          // openingHours: formattedOpeningHours,
          openingHours: businessDeatilsData?.businessOpeningHours,
          logo: businessDeatilsData?.businessLogo,
          financeOffers: service?.financeOffers,
          prices: service?.prices,
          accreditations: service?.accreditations,
          avgInstallTime: service?.avgInstallTime,
          criteria: JSON.stringify(service?.criteria),
          dailyLeads: leadData?.daily,
          postCodes: leadData?.postCodeTargettingList,
          detailsType: "NEW DETAILS",
        };
        businessDetailsSubmission(messageToSendInBusinessSubmission);
        fullySignupForNonBillableClients(messageToSendInBusinessSubmission);
      }

      if (
        user.premiumUser &&
        user.premiumUser == PROMO_LINK.PREMIUM_USER_NO_TOP_UP
      ) {
        const promoLink = await FreeCreditsLink.findById(user?.promoLinkId);
        const params = {
          buyerId: user.buyerId,
          freeCredits: promoLink?.freeCredits,
        };
        addCreditsToBuyer(params)
          .then((_res) => {
            console.log(
              "free credits added with signup code",
              new Date(),
              "Today's Date"
            );
          })
          .catch((error) => {
            console.log(
              "error during adding free credits with signup code",
              new Date(),
              "Today's Date"
            );
          });
      }
      return res.json({ data: details, service });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static showById = async (req: Request, res: Response): Promise<any> => {
    const currentUser = req.user;
    const Id = req.params.id;
    try {
      //@ts-ignore
      if (Id != currentUser?.userLeadsDetailsId) {
        return res.status(403).json({
          error: { message: "You dont't have access to this resource.!" },
        });
      }
      const data = await UserLeadsDetails.find({
        _id: Id,
        isDeleted: false,
      });
      if (
        //@ts-ignore

        currentUser?.role == RolesEnum.INVITED &&
        //@ts-ignore

        currentUser?.userLeadsDetailsId != Id
      ) {
        return res.status(403).json({
          error: { message: "You dont't have access to this resource.!" },
        });
      }
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };

  static show = async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await UserLeadsDetails.find({ isDeleted: false });
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const details = await UserLeadsDetails.findById(id);
    if (details?.isDeleted) {
      return res
        .status(400)
        .json({ error: { message: "details has been already deleted." } });
    }

    try {
      const data = await UserLeadsDetails.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
      });

      if (!data) {
        return res
          .status(400)
          .json({ error: { message: "details to delete does not exists." } });
      }

      return res.json({ message: "details deleted successfully." });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static updateLeadDetails = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const id = req.params.id;
    const input = req.body;
    delete input._id;
    try {
      let msg = "Updated successfully.";
      if (input.leadAlertsFrequency) {
        msg = "Notifications Updated Successfully";
      }
      if (input.sendDataToZapier) {
        msg = "Webhook URL Updated Successfully";
      }
      if (input.smsPhoneNumber) {
        msg = "SMS Notifications Updated Successfully";
      }
      const details = await UserLeadsDetails.findById(id);
      const userForActivity = await UserLeadsDetails.findById(
        id,
        " -_id -userId -createdAt -updatedAt"
      ).lean();

      const user: any = await User.findById(details?.userId);

      const serviceDataForActivityLogs = await UserService.findOne(
        { userId: user?.id },
        "-_id -__v -userId -createdAt -deletedAt -updatedAt"
      );

      if (input.zapierUrl) {
        await UserLeadsDetails.findByIdAndUpdate(
          user?.userLeadsDetailsId,
          { zapierUrl: input.zapierUrl, sendDataToZapier: true },

          { new: true }
        );
      }
      if (!details) {
        return res
          .status(404)
          .json({ error: { message: "details does not exists." } });
      }
      const data = await UserLeadsDetails.findByIdAndUpdate(
        id,
        { ...input },
        {
          new: true,
        }
      );

      const userAfterMod =
        (await UserLeadsDetails.findById(
          id,
          " -_id -userId -createdAt -updatedAt"
        ).lean()) ?? ({} as UserLeadsDetailsInterface);
      const fields = findUpdatedFields(userForActivity, userAfterMod);

      if (
        Object.keys(fields.updatedFields).find(
          (key) => key.startsWith("postCode") || key.startsWith("postcode")
        ) &&
        user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
      ) {
        const business = await BusinessDetails.findById(user.businessDetailsId);

        let paramsToSend: PostcodeWebhookParams = {
          userId: user._id,
          buyerId: user.buyerId,
          businessName: business?.businessName,
          eventCode: EVENT_TITLE.POST_CODE_UPDATE,
        };
        if (userAfterMod.type === POSTCODE_TYPE.RADIUS) {
          (paramsToSend.type = POSTCODE_TYPE.RADIUS),
            (paramsToSend.postcode = userAfterMod.postcode),
            (paramsToSend.miles = userAfterMod?.miles);
        } else {
          paramsToSend.postCodeList = flattenPostalCodes(
            userAfterMod?.postCodeTargettingList
          );
        }
        await eventsWebhook(paramsToSend)
          .then(() =>
            console.log(
              "event webhook for postcode updates hits successfully.",
              paramsToSend,
              new Date(),
              "Today's Date"
            )
          )
          .catch((err) =>
            console.log(
              err,
              "error while triggering postcode updates webhooks failed",
              paramsToSend,
              new Date(),
              "Today's Date"
            )
          );
      }

      const userr = await User.findOne({ userLeadsDetailsId: req.params.id });
      const isEmpty = Object.keys(fields.updatedFields).length === 0;

      if (!isEmpty && userr?.isSignUpCompleteWithCredit) {
        const activity = {
          //@ts-ignore
          actionBy: req?.user?.role,
          actionType: ACTION.UPDATING,
          targetModel: MODEL_ENUM.USER_LEAD_DETAILS,
          userEntity: userr?.id,
          originalValues: fields.oldFields,
          modifiedValues: fields.updatedFields,
        };
        await ActivityLogs.create(activity);
      }
      const serviceData = await UserService.findOne({ userId: user.id });
      const service = await UserService.findByIdAndUpdate(
        serviceData?.id,
        input,
        { new: true }
      );
      const lead = await UserLeadsDetails.findById(id);
      const userId = lead?.userId;
      const business = await BusinessDetails.findById(user.businessDetailsId);

      if (
        !arraysAreEqual(input.leadSchedule, details.leadSchedule) &&
        user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
      ) {
        let paramsToSend: PostcodeWebhookParams = {
          userId: user?._id,
          buyerId: user?.buyerId,
          businessName: business?.businessName,
          eventCode: EVENT_TITLE.LEAD_SCHEDULE_UPDATE,

          leadSchedule: userAfterMod?.leadSchedule,
        };
        if (userAfterMod.type === POSTCODE_TYPE.RADIUS) {
          (paramsToSend.type = POSTCODE_TYPE.RADIUS),
            (paramsToSend.postcode = userAfterMod.postcode),
            (paramsToSend.miles = userAfterMod?.miles);
        } else {
          paramsToSend.postCodeList = flattenPostalCodes(
            userAfterMod?.postCodeTargettingList
          );
        }
        await eventsWebhook(paramsToSend)
          .then(() =>
            console.log(
              "event webhook for postcode updates hits successfully.",
              paramsToSend
            )
          )
          .catch((err) =>
            console.log(
              err,
              "error while triggering postcode updates webhooks failed",
              paramsToSend
            )
          );
      }

      if (
        input.daily != details?.daily &&
        userId &&
        user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
      ) {
        const user =
          (await User.findById(userId).populate("businessDetailsId")) ??
          ({} as UserInterface);
        if (user && user.leadCost !== undefined) {
          await UserLeadsDetails.findByIdAndUpdate(id, {
            dailyLeadCost: user.leadCost ?? 0 * input.daily,
          });
        }
        const business = await BusinessDetails.findById(
          user?.businessDetailsId
        );
        let paramsToSend: PostcodeWebhookParams = {
          userId: user?._id,
          buyerId: user?.buyerId,
          businessName: business?.businessName,
          eventCode: EVENT_TITLE.DAILY_LEAD_CAP,

          dailyLeadCap: userAfterMod?.daily,
        };
        if (userAfterMod.type === POSTCODE_TYPE.RADIUS) {
          (paramsToSend.type = POSTCODE_TYPE.RADIUS),
            (paramsToSend.postcode = userAfterMod.postcode),
            (paramsToSend.miles = userAfterMod?.miles);
        } else {
          paramsToSend.postCodeList = flattenPostalCodes(
            userAfterMod?.postCodeTargettingList
          );
        }
        await eventsWebhook(paramsToSend)
          .then(() =>
            console.log(
              "event webhook for postcode updates hits successfully.",
              paramsToSend
            )
          )
          .catch((err) =>
            console.log(
              err,
              "error while triggering postcode updates webhooks failed",
              paramsToSend
            )
          );
      }
      if (data) {
        const updatedDetails = await UserLeadsDetails.findById(id);
        const userData = await User.findOne({ userLeadsDetailsId: id });
        const businessDeatilsData = await BusinessDetails.findById(
          userData?.businessDetailsId
        );
        const formattedPostCodes = updatedDetails?.postCodeTargettingList
          .map((item: any) => item.postalCode)
          .flat();

        const message = {
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          businessName: businessDeatilsData?.businessName,
          phone: businessDeatilsData?.businessSalesNumber,
          email: userData?.email,
          industry: businessDeatilsData?.businessIndustry,
          address:
            businessDeatilsData?.address1 + " " + businessDeatilsData?.address2,
          city: businessDeatilsData?.businessCity,
          country: businessDeatilsData?.businessCountry,
          // openingHours:formattedOpeningHours,
          openingHours: businessDeatilsData?.businessOpeningHours,
          logo: businessDeatilsData?.businessLogo,
          totalLeads: updatedDetails?.total,
          monthlyLeads: updatedDetails?.monthly,
          weeklyLeads: updatedDetails?.weekly,
          dailyLeads: updatedDetails?.daily,
          leadsHours: updatedDetails?.leadSchedule,
          // leadsHours:formattedLeadSchedule,
          area: `${formattedPostCodes}`,
          leadCost: userData?.leadCost,
        };
        sendEmailForUpdatedDetails(message);
        if (input.criteria) {
          const serviceData = await UserService.findOne(
            { userId: userData?.id },
            "-_id -userId -createdAt -deletedAt -__v -updatedAt"
          );
          const fields = findModifiedFieldsForUserService(
            serviceDataForActivityLogs,
            serviceData
          );
          const isEmpty = Object.keys(fields.updatedFields).length === 0;
          if (!isEmpty && userr?.isSignUpCompleteWithCredit) {
            const activity = {
              //@ts-ignore
              actionBy: req?.user?.role,
              actionType: ACTION.UPDATING,
              targetModel: MODEL_ENUM.USER_SERVICE_DETAILS,
              //@ts-ignore
              userEntity: userr?.id,
              originalValues: fields.oldFields,
              modifiedValues: fields.updatedFields,
            };
            await ActivityLogs.create(activity);
          }
        }
        const card = await CardDetails.findOne({
          userId: userr?.id,
          isDeleted: false,
          isDefault: true,
        });
        cmsUpdateBuyerWebhook(userr?.id, card?.id);
        return res.json({
          data: {
            message: msg,
            data: updatedDetails,
            service,
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
        .json({ error: { message: "Something went wrong.", error } });
    }
  };
}
