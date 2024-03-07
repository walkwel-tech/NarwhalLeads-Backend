import mongoose from "mongoose";
import { BusinessDetailsInterface } from "../../../../types/BusinessInterface";
import { FileEnum } from "../../../../types/FileEnum";
import { UserInterface } from "../../../../types/UserInterface";
import { ACTION } from "../../../../utils/Enums/actionType.enum";
import { MODEL_ENUM } from "../../../../utils/Enums/model.enum";
import { POSTCODE_TYPE } from "../../../../utils/Enums/postcode.enum";
import {
  findUpdatedFields,
  findModifiedFieldsForUserService,
} from "../../../../utils/Functions/findModifiedColumns";
import { ONBOARDING_PERCENTAGE } from "../../../../utils/constantFiles/OnBoarding.keys";
import { countryCurrency } from "../../../../utils/constantFiles/currencyConstants";
import { EVENT_TITLE } from "../../../../utils/constantFiles/events";
import { INTERNATIONAL_CODE } from "../../../../utils/constantFiles/internationalCode";
import { DeleteFile } from "../../../../utils/removeFile";
import { businessDetailsSubmission } from "../../../../utils/webhookUrls/businessDetailsSubmission";
import { cmsUpdateBuyerWebhook } from "../../../../utils/webhookUrls/cmsUpdateBuyerWebhook";
import { eventsWebhook } from "../../../../utils/webhookUrls/eventExpansionWebhook";
import { sendEmailForUpdatedDetails } from "../../../Middlewares/mail";
import { ActivityLogs } from "../../../Models/ActivityLogs";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import { BusinessDetails } from "../../../Models/BusinessDetails";
import { CardDetails } from "../../../Models/CardDetails";
import { LeadTablePreference } from "../../../Models/LeadTablePreference";
import { User } from "../../../Models/User";
import { UserLeadsDetails } from "../../../Models/UserLeadsDetails";
import { UserService } from "../../../Models/UserService";
import { Request, Response } from "express";
import { BuyerDetails } from "../../../Models/BuyerDetails";
import { cmsUpdateWebhook } from "../../../../utils/webhookUrls/cmsUpdateWebhook";
import { POST } from "../../../../utils/constantFiles/HttpMethods";
import { BuyerQuestion } from "../../../../types/BuyerDetailsInterface";
import { daysOfWeek } from "../../../../utils/constantFiles/daysOfWeek";
const ObjectId = mongoose.Types.ObjectId;

interface BusinessOpeningHours {
  openTime: string;
  closeTime: string;
}  
type WebhookData = {
  buyerId?:string;
  businessData: BusinessDetailsInterface;
  buyerQuestions: BuyerQuestion[];
};
export const updateBusinessDetails = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { id } = req.params;
  const input = req.body;

  try {
    const user = await User.findOne({ businessDetailsId: id });

    const details =
      (await BusinessDetails.findOne({ _id: new ObjectId(id) })) ??
      ({} as BusinessDetailsInterface);
    if (
      input.businessSalesNumber &&
      user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
    ) {
      await BusinessDetails.findByIdAndUpdate(
        id,
        { businessSalesNumber: input.businessSalesNumber },
        { new: true }
      );

      let reqBody = {
        userId: user?._id,
        bid: user?.buyerId,
        businessName: details?.businessName,
        businessSalesNumber: INTERNATIONAL_CODE + input.businessSalesNumber,
        eventCode: EVENT_TITLE.BUSINESS_PHONE_NUMBER,
      };
      await eventsWebhook(reqBody)
        .then(() =>
          console.log(
            "event webhook for updating business phone number hits successfully.",
            reqBody,
            new Date(),
            "Today's Date"
          )
        )
        .catch((err) =>
          console.log(
            err,
            "error while triggering business phone number webhooks failed",
            reqBody,
            new Date(),
            "Today's Date"
          )
        );
    }
    const userForActivity = await BusinessDetails.findById(
      id,
      " -_id -createdAt -updatedAt"
    ).lean();

    if (!details) {
      return res
        .status(404)
        .json({ error: { message: "details does not exists." } });
    }
    let userData = await User.findOne({ businessDetailsId: id });

    if (input.businessOpeningHours) {
      input.businessOpeningHours = JSON.parse(input.businessOpeningHours);
    }

    if (input.businessName) {
      // if (userData?.registrationMailSentToAdmin) {
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
          userData?.businessDetailsId.toString();

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
        userData?.businessDetailsId,
        { businessName: input.businessName },

        { new: true }
      );
      // }
    }

    if ((req.file || {}).filename) {
      input.businessLogo = `${FileEnum.PROFILEIMAGE}${req?.file?.filename}`;
    }
    if (input.businessIndustry) {
      const industry = await BuisnessIndustries.findOne({
        industry: input.businessIndustry,
      });
      await User.findByIdAndUpdate(userData?.id, {
        leadCost: industry?.leadCost,
        currency: industry?.associatedCurrency,
        country: industry?.country,
      });
      await LeadTablePreference.findOneAndUpdate(
        { userId: userData?.id },
        { columns: industry?.columns }
      );
    }


    if (input.buyerQuestions) {
      await BuyerDetails.findOneAndUpdate(
        { clientId: userData?.id },
        { buyerQuestions: input.buyerQuestions },
        { upsert: true, new: true }
      );
    }
    const data = await BusinessDetails.findByIdAndUpdate(id, input, {
      new: true,
    });

    const serviceDataForActivityLogs = await UserService.findOne(
      { userId: userData?.id },
      "-_id -__v -userId -createdAt -deletedAt -updatedAt"
    );

    const serviceData = await UserService.findOne({ userId: userData?.id });
    if (input.accreditations) {
      input.accreditations = JSON.parse(input.accreditations);
    }
    if (input.accreditations === "null") {
      delete input.accreditations;
    }
    if (input.financeOffers == "" || input.financeOffers === "null") {
      delete input.financeOffers;
    }
    if (input.financeOffers && input.financeOffers === "Yes") {
      input.financeOffers = true;
    }
    if (input.financeOffers && input.financeOffers === "No") {
      input.financeOffers = false;
    }
    if (input.prices === "null") {
      input.prices = "";
    }
    if (input.avgInstallTime === "null") {
      input.avgInstallTime = "";
    }
    if (input.trustpilotReviews === "null") {
      input.trustpilotReviews = "";
    }
    if (input.criteria === "null") {
      input.criteria = [];
    }
    let service;
    if (serviceData) {
      service = await UserService.findByIdAndUpdate(serviceData?.id, input, {
        new: true,
      });
    } else {
      await UserService.create(input);
    }

    if (data) {
      const updatedDetails = await BusinessDetails.findById(id);
      const leadData = await UserLeadsDetails.findOne({
        userId: userData?._id,
      });
      // const formattedPostCodes = leadData?.postCodeTargettingList
      //   .map((item: any) => item.postalCode)
      //   .flat();

      let formattedPostCodes;
      if (leadData && leadData.type === POSTCODE_TYPE.RADIUS) {
        formattedPostCodes = leadData.postCodeList?.map(({ postcode }) => {
          return postcode;
        });
      } else {
        formattedPostCodes = leadData?.postCodeTargettingList
          .map((item: any) => item.postalCode)
          .flat();
      }
      const currencyObj = countryCurrency.find(
        ({ country, value }) =>
          country === userData?.country && value === userData?.currency
      );

      const originalDailyLimit = leadData?.daily ?? 0;

      const fiftyPercentVariance = Math.round(
        originalDailyLimit + 0.5 * originalDailyLimit
      );
      const message = {
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        businessName: updatedDetails?.businessName,
        phone: updatedDetails?.businessSalesNumber,
        email: userData?.email,
        industry: updatedDetails?.businessIndustry,
        address: updatedDetails?.address1 + " " + updatedDetails?.address2,
        city: updatedDetails?.businessCity,
        country: updatedDetails?.businessCountry,
        // openingHours: formattedOpeningHours,
        openingHours: updatedDetails?.businessOpeningHours,
        logo: updatedDetails?.businessLogo,
        totalLeads: leadData?.total,
        monthlyLeads: leadData?.monthly,
        weeklyLeads: leadData?.weekly,
        dailyLeads: leadData?.daily,
        // leadsHours: formattedLeadSchedule,
        leadsHours: leadData?.leadSchedule,
        area: `${formattedPostCodes}`,
        leadCost: userData?.leadCost,
        currencyCode: currencyObj?.symbol,
        mobilePrefixCode: userData?.mobilePrefixCode,
        dailyCap: fiftyPercentVariance,
      };
      sendEmailForUpdatedDetails(message);

      const messageToSendInBusinessSubmission = {
        businessName: updatedDetails?.businessName,
        phone: updatedDetails?.businessSalesNumber,
        email: userData?.email,
        industry: updatedDetails?.businessIndustry,
        address: updatedDetails?.address1 + " " + updatedDetails?.address2,
        city: updatedDetails?.businessCity,
        country: updatedDetails?.businessCountry,
        // openingHours: formattedOpeningHours,
        openingHours: updatedDetails?.businessOpeningHours,
        logo: updatedDetails?.businessLogo,
        financeOffers: service?.financeOffers,
        prices: service?.prices,
        accreditations: service?.accreditations,
        avgInstallTime: service?.avgInstallTime,
        criteria: JSON.stringify(service?.criteria),
        dailyLeads: leadData?.daily,
        postCodes: leadData?.postCodeTargettingList,
        detailsType: "UPDATED DETAILS",
      };
      businessDetailsSubmission(messageToSendInBusinessSubmission);
      if (req.file && details.businessLogo) {
        DeleteFile(`${details.businessLogo}`);
      }
      const userAfterMod = await BusinessDetails.findById(
        id,
        " -_id  -createdAt -updatedAt"
      ).lean();

      const fields = findUpdatedFields(userForActivity, userAfterMod);
      const userr = await User.findOne({ businessDetailsId: req.params.id });
      const webhookData: WebhookData = {
        buyerId: userr?.buyerId,
        businessData: data,
        buyerQuestions: input?.buyerQuestions,
      };

      const businessOpeningHours: BusinessOpeningHours[] =
      webhookData.businessData?.businessOpeningHours ?? [];
  
      const openingHours = businessOpeningHours.map(
        ({ openTime, closeTime }) => `${openTime}-${closeTime}`
      );
  
      const formattedOpeningHours = daysOfWeek.reduce((acc: any, day, index) => {
        acc[`openingHours${day}`] = openingHours[index] ?? "closed";
        return acc;
      }, {});
  
      const formattedBody = {
        buyerId: webhookData.buyerId ?? " ",
        industry: webhookData.businessData?.businessIndustry ?? "",
        postcodes: webhookData.businessData?.businessPostCode ?? "",
        buyerName: webhookData.businessData?.businessName ?? "",
        buyerPhone: webhookData.businessData?.businessSalesNumber ?? "",
        businessDescription: webhookData.businessData?.businessDescription ?? "",
        ...formattedOpeningHours,
        industryQuestions: webhookData.buyerQuestions.map(
          (question: BuyerQuestion) => ({
            title: question.title,
            answer: question.answer ?? "",
          })
        ),
      };
      await cmsUpdateWebhook("data/buyer", POST, formattedBody);
      const isEmpty = Object.keys(fields.updatedFields).length === 0;
      let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);

      if (!isEmpty && userr?.isSignUpCompleteWithCredit) {
        const activity = {
          actionBy: user.role,
          actionType: ACTION.UPDATING,
          targetModel: MODEL_ENUM.BUSINESS_DETAILS,
          userEntity: userr?.id,
          originalValues: fields.oldFields,
          modifiedValues: fields.updatedFields,
        };
        await ActivityLogs.create(activity);
      }

      if (
        input.financeOffers ||
        input.prices ||
        input.accreditations ||
        input.avgInstallTime ||
        input.trustpilotReviews
      ) {
        const serviceData = await UserService.findOne(
          { userId: userData?.id },
          "-_id -userId -createdAt -deletedAt -__v -updatedAt"
        );
        const fields = findModifiedFieldsForUserService(
          serviceDataForActivityLogs,
          serviceData
        );
        let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);

        const isEmpty = Object.keys(fields.updatedFields).length === 0;
        if (!isEmpty && userr?.isSignUpCompleteWithCredit) {
          const activity = {
            actionBy: user?.role,
            actionType: ACTION.UPDATING,
            targetModel: MODEL_ENUM.USER_SERVICE_DETAILS,
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
          message: "businessDetails updated successfully.",
          data: updatedDetails,
          service,
          leadCost: userData?.leadCost,
        },
      });
    } else {
      return res.json({
        data: { message: "Incorrect input fields" },
      });
    }
  } catch (error) {
    console.log(error, ">>>> error");
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", error } });
  }
};
