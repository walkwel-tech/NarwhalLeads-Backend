import { validate } from "class-validator";
import mongoose, { Types } from "mongoose";
import logger from "../../../../utils/winstonLogger/logger";
import { AccessToken } from "../../../Models/AccessToken";
import { AccessTokenInterface } from "../../../../types/AccessTokenInterface";
import { BuisnessIndustriesInterface } from "../../../../types/BuisnessIndustriesInterface";
import {BusinessDetailsInterface, isBusinessObject} from "../../../../types/BusinessInterface";
import { FileEnum } from "../../../../types/FileEnum";
import { UserInterface } from "../../../../types/UserInterface";
import { ValidationErrorResponse } from "../../../../types/ValidationErrorResponse";
import {
  createContactOnXero,
  refreshToken,
} from "../../../../utils/XeroApiIntegration/createContact";
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../../../utils/constantFiles/OnBoarding.keys";
import { additionalColumnsForLeads } from "../../../../utils/constantFiles/additionalColumnsOnClientLeadsTable";
import { SENDGRID_STATUS_PERCENTAGE } from "../../../../utils/constantFiles/sendgridStatusPercentage";
import { DEFAULT } from "../../../../utils/constantFiles/user.default.values";
import { createCustomersOnRyftAndLeadByte } from "../../../../utils/createCustomer";
import { createContact } from "../../../../utils/sendgrid/createContactSendgrid";
import { updateUserSendgridJobIds } from "../../../../utils/sendgrid/updateSendgridJobIds";
import { BusinessDetailsInput } from "../../../Inputs/BusinessDetails.input";
import { Request, Response } from "express";
import { CreateCustomerInput } from "../../../Inputs/createCustomerOnRyft&Lead.inputs";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import { BusinessDetails } from "../../../Models/BusinessDetails";
import { LeadTablePreference } from "../../../Models/LeadTablePreference";
import { User } from "../../../Models/User";
import { UserService } from "../../../Models/UserService";
import { FreeCreditsLink } from "../../../Models/freeCreditsLink";
import { createBuyerQuestions } from "../../BuyerDetails/Actions/createBuyerDetailsAction";
import { leadCenterWebhook } from "../../../../utils/webhookUrls/leadCenterWebhook";
import { POST } from "../../../../utils/constantFiles/HttpMethods";
import { EVENT_TITLE } from "../../../../utils/constantFiles/events";
import { cmsUpdateWebhook } from "../../../../utils/webhookUrls/cmsUpdateWebhook";
import { BuyerQuestion } from "../../../../types/BuyerDetailsInterface";
import { daysOfWeek } from "../../../../utils/constantFiles/daysOfWeek";
const ObjectId = mongoose.Types.ObjectId;

type WebhookData = {
  buyerId:string;
  businessData: BusinessDetailsInterface;
  buyerQuestions: BuyerQuestion[];
};

interface BusinessOpeningHours {
  openTime: string;
  closeTime: string;
}

export const create = async (req: Request, res: Response): Promise<any> => {
  const input = req.body;

  if (!input.userId) {
    return res.status(400).json({ error: { message: "User Id is required" } });
  }

  const businessDetailsInput = new BusinessDetailsInput();
  (businessDetailsInput.businessIndustry = input.businessIndustry),
    (businessDetailsInput.businessName = input.businessName),
    (businessDetailsInput.businessSalesNumber = input.businessSalesNumber),
    (businessDetailsInput.address1 = input.address1),
    (businessDetailsInput.businessCity = input.businessCity),
    (businessDetailsInput.businessUrl = input.businessUrl),
    (businessDetailsInput.businessPostCode = input.businessPostCode);
    businessDetailsInput.buyerQuestions = Array.isArray(input.buyerQuestions) ? input.buyerQuestions : [];

  businessDetailsInput.businessMobilePrefixCode = input.businessMobilePrefixCode;
  businessDetailsInput.businessOpeningHours = JSON.parse(input?.businessOpeningHours);
  const errors = await validate(businessDetailsInput);
  const filteredErrors = errors.filter(
    (error) => error.property !== "buyerQuestions"
  );
  const isBusinessNameExist = await BusinessDetails.find({
    businessName: input.businessName,
    isDeleted: false,
  });

  if (isBusinessNameExist.length > 0) {
    return res
      .status(400)
      .json({ error: { message: "Business Name Already Exists." } });
  }
  const user = await User.findById(input.userId);

  if (!user) {
    return res.status(404).json({ error: { message: "User not found." } });
  }

  let userEmail = user.email;

  const { onBoarding }: any = user || {};
  let object = onBoarding || [];
  let array: any = [];
  if (filteredErrors.length) {
    const errorsInfo: ValidationErrorResponse[] = filteredErrors.map(
      (error) => ({
        property: error.property,
        constraints: error.constraints,
      })
    );
    errorsInfo.forEach((error) => {
      array.push(error.property);
    });
    const existLead = object.find(
      (item: any) => item.key === ONBOARDING_KEYS.BUSINESS_DETAILS
    );

    if (existLead) {
      existLead.pendingFields = array;
      object = object.map((obj: any) =>
        obj.key === existLead.key ? existLead : obj
      );
    } else {
      const mock = {
        key: ONBOARDING_KEYS.BUSINESS_DETAILS,
        pendingFields: array,
      };
      object.push(mock);
    }
  } else {
    object = object.map((obj: any) =>
      obj.key === ONBOARDING_KEYS.BUSINESS_DETAILS
        ? (obj = { key: ONBOARDING_KEYS.BUSINESS_DETAILS, pendingFields: [] })
        : obj
    );
    object = object.map((obj: any) =>
      obj.key === ONBOARDING_KEYS.CARD_DETAILS
        ? (obj = {
            key: ONBOARDING_KEYS.CARD_DETAILS,
            pendingFields: obj.pendingFields,
            dependencies: [],
          })
        : obj
    );
  }
  await User.findByIdAndUpdate(
    input.userId,
    { onBoarding: object },
    { new: true }
  );

  // input.businessOpeningHours=JSON.parse(input.businessOpeningHours)
  try {
    let dataToSave: Partial<BusinessDetailsInterface> = {
      businessIndustry: businessDetailsInput?.businessIndustry,
      businessName: businessDetailsInput?.businessName,
      businessUrl: businessDetailsInput?.businessUrl,
      businessDescription: input?.businessDescription,
      // businessLogo: `${FileEnum.PROFILEIMAGE}${req?.file.filename}`,
      businessSalesNumber: businessDetailsInput?.businessSalesNumber,
      businessAddress: businessDetailsInput?.address1 + " " + input?.address2,
      address1: businessDetailsInput?.address1,
      address2: input?.address2,
      businessCity: businessDetailsInput?.businessCity,
      businessPostCode: businessDetailsInput?.businessPostCode,
      businessMobilePrefixCode: businessDetailsInput?.businessMobilePrefixCode,
      businessOpeningHours: JSON.parse(input?.businessOpeningHours),
    };
    if (req?.file) {
      dataToSave.businessLogo = `${FileEnum.PROFILEIMAGE}${req?.file.filename}`;
    }
    const userBusinessDetails = await BusinessDetails.create(dataToSave);
    const buyerQuestions = await createBuyerQuestions(
      businessDetailsInput.buyerQuestions,
      input.userId
    );
    const industry: BuisnessIndustriesInterface =
      (await BuisnessIndustries.findOne({
        industry: input?.businessIndustry,
      })) ?? ({} as BuisnessIndustriesInterface);

    const isUser = await User.findById(input.userId);
    const promoLink = await FreeCreditsLink.findById(isUser?.promoLinkId);
    let updatedLeadCost = industry?.leadCost;

    if (promoLink && promoLink.discount && promoLink.discount !== 0) {
      const discount: number = promoLink.discount;
      const discountedAmount = (discount / 100) * industry?.leadCost;
      updatedLeadCost -= discountedAmount;
    }
    await User.findByIdAndUpdate(input.userId, {
      businessDetailsId: new ObjectId(userBusinessDetails._id),
      leadCost: updatedLeadCost,
      businessIndustryId: industry?.id,
      currency: industry.associatedCurrency,
      country: industry.country,
      onBoardingPercentage: ONBOARDING_PERCENTAGE.BUSINESS_DETAILS,
      autoChargeAmount: DEFAULT.AUTO_CHARGE_AMOUNT * industry?.leadCost,
      triggerAmount: DEFAULT.TRIGGER_AMOUT * industry?.leadCost,
    });
    const user: UserInterface =
      (await User.findById(input.userId).populate('businessDetailsId').lean(true)) ?? ({} as UserInterface);
    if (process.env.SENDGRID_API_KEY) {
      const sendgridResponse = await createContact(userEmail, {
        signUpStatus:
          SENDGRID_STATUS_PERCENTAGE.BUSINESS_DETAILS_PERCENTAGE || "",
        businessIndustry: businessDetailsInput?.businessIndustry,
      });
      const jobId = sendgridResponse?.body?.job_id;

      await updateUserSendgridJobIds(user.id, jobId);
    }


    const webhookData: WebhookData = {
      buyerId: user.buyerId,
      businessData: userBusinessDetails,
      buyerQuestions: businessDetailsInput?.buyerQuestions,
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

    const additionalColumns = additionalColumnsForLeads(
      industry?.columns.length
    );
    industry?.columns.push(...additionalColumns);
    await LeadTablePreference.create({
      userId: input.userId,
      columns: industry?.columns,
    });
    if (user.promoLinkId) {
      const dataToUpdate = {
        $push: { users: user.id },
      };
      await FreeCreditsLink.findByIdAndUpdate(user.promoLinkId, dataToUpdate, {
        new: true,
      });
    }

    const paramsToCreateContact = {
      name: user.firstName + " " + user.lastName,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.email,
      addressLine1: input.businessName,
      addressLine2: input.address1 + " " + input.address2,
      city: input.businessCity,
      postalCode: input.businessPostCode,
      businessName: input.businessName,
    };
    try {
      const token: AccessTokenInterface =
        (await AccessToken.findOne()) ?? ({} as AccessTokenInterface);
      createContactOnXero(paramsToCreateContact, token?.access_token)
        .then(async (res: any) => {
          await User.findOneAndUpdate(
            { email: user.email },
            {
              xeroContactId: res.data.Contacts[0].ContactID,
              isXeroCustomer: true,
            },
            { new: true }
          );
          logger.info(`XERO Contact Creation: Success ${user._id} ${res.data.Contacts[0].ContactID}`);
        })
        .catch((err) => {
          refreshToken()
            .then(async (res: any) => {
              console.log(
                "Token updated while creating customer!!!",
                new Date(),
                "Today's Date"
              );
              createContactOnXero(paramsToCreateContact, res.data.access_token)
                .then(async (res: any) => {
                  await User.findOneAndUpdate(
                    { email: user.email },
                    {
                      // $set: {
                      xeroContactId: res.data.Contacts[0].ContactID,
                      isXeroCustomer: true,
                      // },
                    },
                    { new: true }
                  );
                  logger.info(`XERO Contact Creation: Success ${user._id} ${res.data.Contacts[0].ContactID}`);
                })
                .catch((error) => {
                  logger.error(`XERO Contact Creation: Failed ${user._id}`, JSON.stringify(error.response.data));
                });
            })
            .catch((err) => {
              logger.error(`XERO Contact Creation: Token Refresh Failed ${user._id}`, JSON.stringify(err.response.data));
            });
        });
    } catch (error) {
      logger.error(`XERO Contact Creation: Failed Fatal ${user._id}`, JSON.stringify(error.response.data));
    }


    if (input.accreditations) {
      input.accreditations = JSON.parse(input.accreditations);
    }
    if (input.accreditations == null || input.accreditations == "") {
      delete input.accreditations;
    }
    if (input.financeOffers && input.financeOffers == "Yes") {
      input.financeOffers = true;
    }
    if (input.financeOffers == null || input.financeOffers == "") {
      delete input.financeOffers;
    }
    if (input.financeOffers && input.financeOffers == "No") {
      input.financeOffers = false;
    }

    if (input.prices == null) {
      delete input.prices;
    }
    if (input.avgInstallTime == null) {
      delete input.avgInstallTime;
    }
    if (input.trustpilotReviews == null) {
      delete input.trustpilotReviews;
    }
    if (input.criteria == null) {
      delete input.criteria;
    }
    const service = await UserService.create(input);
    const updatedUser = await User.findByIdAndUpdate(user.id, { userServiceId: service.id }, {new: true});
    leadCenterWebhook("clients/data-sync/",POST,{...userBusinessDetails.toObject(), ...updatedUser?.toObject()}, {
      eventTitle: EVENT_TITLE.USER_UPDATE_LEAD,
      id: updatedUser?._id as Types.ObjectId,
    })

    res.json({
      data: userBusinessDetails,
      service,
      leadCost: user?.leadCost,
      buyerQuestions,
    });


    const params: CreateCustomerInput = {
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      company: input.businessName,
      userId: user?._id,
      street1: input?.businessAddress,
      street2: input?.businessAddress,
      towncity: input?.businessCity,
      // county:Name of county,
      postcode: input?.businessPostCode,
      // country_name: input.businessCountry,
      phone: input?.businessSalesNumber,
      businessId: userBusinessDetails?.id,
      country_name: "",
    };
    const leadbyteValidation = Object.values(params).some(
      (value: any) => value === undefined
    );
    if (!leadbyteValidation) {
      await createCustomersOnRyftAndLeadByte(params)
        .then(async (...responses) => {
          console.log("Customer created!!!!", new Date(), "Today's Date");
        })
        .catch((err) => {
          console.log(
            "error while creating customer",
            new Date(),
            "Today's Date"
          );
        });
    }

    try {

      const userPostProcess: UserInterface = await User.findById(input.userId).lean(true);

      const cmsWebhookBody = {
        buyerId: userPostProcess.buyerId ?? " ",
        industry: webhookData.businessData?.businessIndustry ?? "",
        websiteLink: webhookData.businessData?.businessUrl ?? "",
        centralIndustryId: industry?.centralIndustryId ?? "",
        postcodes: webhookData.businessData?.businessPostCode ?? "",
        buyerName: webhookData.businessData?.businessName ?? "",
        buyerPhone: webhookData.businessData?.businessSalesNumber ?? "",
        businessDescription: webhookData.businessData?.businessDescription ?? "",
        ...formattedOpeningHours,
        industryQuestions: webhookData.buyerQuestions?.map(
          (question: BuyerQuestion) => ({
            title: question.columnName,
            answer: question.answer ?? "",
          })
        ),
      };

      if (isBusinessObject(user?.businessDetailsId) && user?.businessDetailsId?.businessLogo) {
        cmsWebhookBody.businessLogo = `${process.env.APP_URL}${user?.businessDetailsId?.businessLogo}`;
      }

      cmsUpdateWebhook("data/buyer", POST, cmsWebhookBody)
        .then((res) => {
          logger.info(`CMS Buyer ${cmsWebhookBody.buyerId} updated successfully`, res);
        })
        .catch((err) => {
          logger.error(`CMS Buyer ${cmsWebhookBody.buyerId} update failed`, err);
        });
    } catch (error) {
      logger.error("CMS Buyer update failed", error);
    }

  } catch (error) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", error } });
  }
};
