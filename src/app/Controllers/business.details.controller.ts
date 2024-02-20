import { validate } from "class-validator";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { FileEnum } from "../../types/FileEnum";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../utils/constantFiles/OnBoarding.keys";
import { createCustomersOnRyftAndLeadByte } from "../../utils/createCustomer";
import { DeleteFile } from "../../utils/removeFile";
import { BusinessDetailsInput } from "../Inputs/BusinessDetails.input";
import {
  // sendEmailForNewRegistration,
  sendEmailForUpdatedDetails,
} from "../Middlewares/mail";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { BusinessDetails } from "../Models/BusinessDetails";

import {
  createContactOnXero,
  refreshToken,
} from "../../utils/XeroApiIntegration/createContact";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
// import { LeadTablePreference } from "../Models/LeadTablePreference";
import { AccessToken } from "../Models/AccessToken";
import { UserService } from "../Models/UserService";
import { businessDetailsSubmission } from "../../utils/webhookUrls/businessDetailsSubmission";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { createCustomerOnLeadByte } from "../../utils/createCustomer/createOnLeadByte";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import {
  findModifiedFieldsForUserService,
  findUpdatedFields,
} from "../../utils/Functions/findModifiedColumns";
import { ACTION } from "../../utils/Enums/actionType.enum";
import { MODEL_ENUM } from "../../utils/Enums/model.enum";
import { ActivityLogs } from "../Models/ActivityLogs";
import { additionalColumnsForLeads } from "../../utils/constantFiles/additionalColumnsOnClientLeadsTable";
import { UserInterface } from "../../types/UserInterface";
import { BusinessDetailsInterface } from "../../types/BusinessInterface";
import { BuisnessIndustriesInterface } from "../../types/BuisnessIndustriesInterface";
import { AccessTokenInterface } from "../../types/AccessTokenInterface";
import { CreateCustomerInput } from "../Inputs/createCustomerOnRyft&Lead.inputs";
import { cmsUpdateBuyerWebhook } from "../../utils/webhookUrls/cmsUpdateBuyerWebhook";
import { CardDetails } from "../Models/CardDetails";
import { eventsWebhook } from "../../utils/webhookUrls/eventExpansionWebhook";
import { EVENT_TITLE } from "../../utils/constantFiles/events";
import { DEFAULT } from "../../utils/constantFiles/user.default.values";
import { INTERNATIONAL_CODE } from "../../utils/constantFiles/internationalCode";
import { POSTCODE_TYPE } from "../../utils/Enums/postcode.enum";
import { countryCurrency } from "../../utils/constantFiles/currencyConstants";
import { createContact } from "../../utils/sendgrid/createContactSendgrid";
import { updateUserSendgridJobIds } from "../../utils/sendgrid/updateSendgridJobIds";
import { SENDGRID_STATUS_PERCENTAGE } from "../../utils/constantFiles/sendgridStatusPercentage";

const ObjectId = mongoose.Types.ObjectId;

export class BusinessDetailsController {
  static create = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;

    if (!input.userId) {
      return res
        .status(400)
        .json({ error: { message: "User Id is required" } });
    }

    const Business = new BusinessDetailsInput();
    (Business.businessIndustry = input.businessIndustry),
      (Business.businessName = input.businessName),
      (Business.businessSalesNumber = input.businessSalesNumber),
      (Business.address1 = input.address1),
      (Business.businessCity = input.businessCity),
      (Business.businessPostCode = input.businessPostCode);
    Business.businessMobilePrefixCode = input.businessMobilePrefixCode;

    Business.businessOpeningHours = JSON.parse(input?.businessOpeningHours);
    const errors = await validate(Business);
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
    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));
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
        businessIndustry: Business?.businessIndustry,
        businessName: Business?.businessName,
        businessDescription: input?.businessDescription,
        // businessLogo: `${FileEnum.PROFILEIMAGE}${req?.file.filename}`,
        businessSalesNumber: Business?.businessSalesNumber,
        businessAddress: Business?.address1 + " " + input?.address2,
        address1: Business?.address1,
        address2: input?.address2,
        businessCity: Business?.businessCity,
        businessPostCode: Business?.businessPostCode,
        businessMobilePrefixCode: Business?.businessMobilePrefixCode,
        businessOpeningHours: JSON.parse(input?.businessOpeningHours),
        // businessOpeningHours: (input?.businessOpeningHours),
      };
      if (req?.file) {
        dataToSave.businessLogo = `${FileEnum.PROFILEIMAGE}${req?.file.filename}`;
      }
      const userData = await BusinessDetails.create(dataToSave);
   
    

      const industry: BuisnessIndustriesInterface =
        (await BuisnessIndustries.findOne({
          industry: input?.businessIndustry,
        })) ?? ({} as BuisnessIndustriesInterface);

        const isUser = await User.findOne(input.userId);
        const promoLink = await FreeCreditsLink.findOne(isUser?.promoLinkId)
        let updatedLeadCost = industry?.leadCost;

        if (promoLink && promoLink.discount && promoLink.discount !== 0) {
          const discount: number = promoLink.discount;
          const discountedAmount = (discount / 100) * (industry?.leadCost);
          updatedLeadCost -= discountedAmount;
        }
      await User.findByIdAndUpdate(input.userId, {
        businessDetailsId: new ObjectId(userData._id),
        leadCost: updatedLeadCost,
        businessIndustryId: industry?.id,
        currency: industry.associatedCurrency,
        country: industry.country,
        onBoardingPercentage: ONBOARDING_PERCENTAGE.BUSINESS_DETAILS,
        autoChargeAmount: DEFAULT.AUTO_CHARGE_AMOUNT * industry?.leadCost,
        triggerAmount: DEFAULT.TRIGGER_AMOUT * industry?.leadCost,
      });
      const user: UserInterface =
        (await User.findById(input.userId)) ?? ({} as UserInterface);
        if (process.env.SENDGRID_API_KEY) {
          const sendgridResponse = await createContact(userEmail, {
          signUpStatus:
            SENDGRID_STATUS_PERCENTAGE.BUSINESS_DETAILS_PERCENTAGE || "",
          businessIndustry: Business?.businessIndustry,
        });
        const jobId = sendgridResponse?.body?.job_id;

        await updateUserSendgridJobIds(user.id, jobId);
      }
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
        await FreeCreditsLink.findByIdAndUpdate(
          user.promoLinkId,
          dataToUpdate,
          { new: true }
        );
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
          console.log(
            "success in creating contact",
            new Date(),
            "Today's Date"
          );
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
                  console.log(
                    "success in creating contact",
                    new Date(),
                    "Today's Date"
                  );
                })
                .catch((error) => {
                  console.log(
                    "error in creating customer after token updation.",
                    new Date(),
                    "Today's Date"
                  );
                });
            })
            .catch((err) => {
              console.log(
                "error in creating contact on xero",
                err.response.data,
                new Date(),
                "Today's Date"
              );
            });
        });
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
      await User.findByIdAndUpdate(user.id, { userServiceId: service.id });
      res.json({
        data: userData,
        service,
        leadCost: user?.leadCost,
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
        businessId: userData?.id,
        country_name: "",
      };
      const paramsObj = Object.values(params).some(
        (value: any) => value === undefined
      );
      if (!paramsObj) {
        createCustomersOnRyftAndLeadByte(params)
          .then(() => {
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
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static updateBusinessDetails = async (
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
          ({ country, value }) => country === userData?.country && value === userData?.currency
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
      console.log(error, ">>>> error")
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static show = async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await BusinessDetails.find({ isDeleted: false });
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };

  static showById = async (req: Request, res: Response): Promise<any> => {
    const Id = req.params.id;
    try {
      const userData = await User.findById(Id).populate("businessDetailsId");
      const data = await BusinessDetails.find({
        _id: Id,
        isDeleted: false,
      });
      let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);

      if (
        user?.role == RolesEnum.INVITED &&
        userData?.businessDetailsId !== new ObjectId(Id)
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

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const details = await BusinessDetails.findById(id);
    if (details?.isDeleted) {
      return res
        .status(400)
        .json({ error: { message: "details has been already deleted." } });
    }

    try {
      const data = await BusinessDetails.findByIdAndUpdate(id, {
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

  static nonBillableBusinessDetails = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const input = req.body;

    if (!input.userId) {
      return res
        .status(400)
        .json({ error: { message: "User Id is required" } });
    }
    const Business = new BusinessDetailsInput();
    (Business.businessIndustry = input.businessIndustry),
      (Business.businessName = input.businessName),
      (Business.businessSalesNumber = input.businessSalesNumber),
      (Business.address1 = input.address1),
      (Business.businessCity = input.businessCity),
      (Business.businessPostCode = input.businessPostCode);
    Business.businessOpeningHours = JSON.parse(input?.businessOpeningHours);
    const isBusinessNameExist = await BusinessDetails.findOne({
      businessName: input.businessName,
      isDeleted: false,
    });
    const user: UserInterface =
      (await User.findById(input.userId)) ?? ({} as UserInterface);

    if (isBusinessNameExist) {
      return res
        .status(400)
        .json({ error: { message: "Business Name Already Exists." } });
    }
    // get onboarding value of user

    // input.businessOpeningHours=JSON.parse(input.businessOpeningHours)
    try {
      let dataToSave: Partial<BusinessDetailsInterface> = {
        businessIndustry: Business?.businessIndustry,
        businessName: Business?.businessName,
        businessDescription: input?.businessDescription,
        // businessLogo: `${FileEnum.PROFILEIMAGE}${req?.file.filename}`,
        businessSalesNumber: Business?.businessSalesNumber,
        businessAddress: Business?.address1 + " " + input?.address2,
        address1: Business?.address1,
        address2: input?.address2,
        businessCity: Business?.businessCity,
        businessPostCode: Business?.businessPostCode,
        businessOpeningHours: JSON.parse(input?.businessOpeningHours),
        // businessOpeningHours: (input?.businessOpeningHours),
      };
      if (req?.file) {
        dataToSave.businessLogo = `${FileEnum.PROFILEIMAGE}${req?.file.filename}`;
      }
      const userData = await BusinessDetails.create(dataToSave);

      const industry: BuisnessIndustriesInterface =
        (await BuisnessIndustries.findOne({
          industry: input?.businessIndustry,
        })) ?? ({} as BuisnessIndustriesInterface);
      const additionalColumns: any = additionalColumnsForLeads(
        industry?.columns.length
      );
      industry?.columns.push(additionalColumns);
      await LeadTablePreference.create({
        userId: input.userId,
        columns: industry?.columns,
      });
      await User.findByIdAndUpdate(input.userId, {
        businessDetailsId: new ObjectId(userData._id),
        leadCost: industry?.leadCost,
        businessIndustryId: industry?.id,
      });

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
      await User.findByIdAndUpdate(user.id, { userServiceId: service.id });
      res.json({
        data: userData,
        service,
        leadCost: user?.leadCost,
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
        businessId: userData?.id,
        country_name: "",
      };
      const paramsObj = Object.values(params).some(
        (value: any) => value === undefined
      );
      if (!paramsObj) {
        createCustomerOnLeadByte(params)
          .then(() => {
            console.log("Customer created!!!!", new Date(), "Today's Date");
          })
          .catch((ERR) => {
            console.log(
              "error while creating customer",
              new Date(),
              "Today's Date"
            );
          });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };
}
