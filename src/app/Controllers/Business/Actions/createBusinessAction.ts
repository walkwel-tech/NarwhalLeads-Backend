import { validate } from "class-validator";
import mongoose from "mongoose";
import { AccessToken } from "../../../Models/AccessToken";
import { AccessTokenInterface } from "../../../../types/AccessTokenInterface";
import { BuisnessIndustriesInterface } from "../../../../types/BuisnessIndustriesInterface";
import { BusinessDetailsInterface } from "../../../../types/BusinessInterface";
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
const ObjectId = mongoose.Types.ObjectId;

export const create = async (req: Request, res: Response): Promise<any> => {
  const input = req.body;

  if (!input.userId) {
    return res.status(400).json({ error: { message: "User Id is required" } });
  }

  const Business = new BusinessDetailsInput();
  (Business.businessIndustry = input.businessIndustry),
    (Business.businessName = input.businessName),
    (Business.businessSalesNumber = input.businessSalesNumber),
    (Business.address1 = input.address1),
    (Business.businessCity = input.businessCity),
    (Business.businessPostCode = input.businessPostCode);
  Business.buyerQuestions = input.buyerQuestions;

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
    };
    if (req?.file) {
      dataToSave.businessLogo = `${FileEnum.PROFILEIMAGE}${req?.file.filename}`;
    }
    const userData = await BusinessDetails.create(dataToSave);
    const buyerQuestions = await createBuyerQuestions(
      Business.buyerQuestions, input.userId
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
        console.log("success in creating contact", new Date(), "Today's Date");
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
    console.log(error, ">>>>>>>>>>> error");
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", error } });
  }
};
