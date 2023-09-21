import { validate } from "class-validator";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { FileEnum } from "../../types/FileEnum";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import { createCustomersOnRyftAndLeadByte } from "../../utils/createCustomer";
import { DeleteFile } from "../../utils/removeFile";
import { BusinessDetailsInput } from "../Inputs/BusinessDetails.input";
import {
  // send_email_for_new_registration,
  send_email_for_updated_details,
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
import { business_details_submission } from "../../utils/webhookUrls/business_details_submission";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { createCustomerOnLeadByte } from "../../utils/createCustomer/createOnLeadByte";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { findModifiedFieldsForUserService, findUpdatedFields } from "../../utils/Functions/findModifiedColumns";
import { ACTION } from "../../utils/Enums/actionType.enum";
import { MODEL_ENUM } from "../../utils/Enums/model.enum";
import { ActivityLogs } from "../Models/ActivityLogs";

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
      //@ts-ignore
      // (Business.businessLogo = String(req.file?.filename)),
      (Business.businessSalesNumber = input.businessSalesNumber),
      (Business.address1 = input.address1),
      // (Business.businessAddress = input.businessAddress),
      (Business.businessCity = input.businessCity),
      // (Business.businessCountry = input.businessCountry),
      (Business.businessPostCode = input.businessPostCode);
    Business.businessOpeningHours = JSON.parse(input?.businessOpeningHours);
    const errors = await validate(Business);
    const isBusinessNameExist = await BusinessDetails.find({
      businessName: input.businessName,
    });
    if (isBusinessNameExist.length > 0) {
      return res
        .status(400)
        .json({ error: { message: "Business Name Already Exists." } });
    }
    const { onBoarding }: any = await User.findById(input.userId);
    let object = onBoarding || [];
    let array: any = [];
    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));
      errorsInfo.forEach((i) => {
        array.push(i.property);
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
    }
    else {
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
      let dataToSave: any = {
        userId: input?.userId,
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
        //@ts-ignore
        dataToSave.businessLogo = `${FileEnum.PROFILEIMAGE}${req?.file.filename}`;
      }
      const userData = await BusinessDetails.create(dataToSave);

      const industry = await BuisnessIndustries.findOne({
        industry: input?.businessIndustry,
      });
      await User.findByIdAndUpdate(input.userId, {
        businessDetailsId: new ObjectId(userData._id),
        leadCost: industry?.leadCost,
        businessIndustryId: industry?.id,
        onBoardingPercentage: input?.onBoardingPercentage,
      });
      const user: any = await User.findById(input.userId);
      if (user.promoLinkId) {
        const dataToUpdate = {
          $push: { user: { userId: user.id, businessDetailsId: userData?.id } },
        };
        const linkUpdate = await FreeCreditsLink.findByIdAndUpdate(
          user.promoLinkId,
          dataToUpdate,
          { new: true }
        );
        console.log("lnk update", linkUpdate);
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
      const token: any = await AccessToken.findOne();
      createContactOnXero(paramsToCreateContact, token?.access_token)
        .then(async (res: any) => {
          await User.findOneAndUpdate(
            { email: user.email },
            {
              xeroContactId: res.data.Contacts[0].ContactID,isXeroCustomer:true
            },
            { new: true }
          );
          console.log("success in creating contact");
        })
        .catch((err) => {
          refreshToken()
            .then(async (res: any) => {
              console.log("Token updated while creating customer!!!");
              createContactOnXero(paramsToCreateContact, res.data.access_token)
                .then(async (res: any) => {
                  await User.findOneAndUpdate(
                    { email: user.email },
                    {
                      // $set: {
                        xeroContactId: res.data.Contacts[0].ContactID,isXeroCustomer:true
                      // },
                    },
                    {new:true}
                  );
                  console.log("success in creating contact");
                })
                .catch((error) => {
                  console.log(
                    "ERROR IN CREATING CUSTOMER AFTER TOKEN UPDATION."
                  );
                });
            })
            .catch((err) => {
              console.log(
                "error in creating contact on xero",
                err.response.data
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
      const params: any = {
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
      };
      const paramsObj = Object.values(params).some(
        (value: any) => value === undefined
      );
      if (!paramsObj) {
        createCustomersOnRyftAndLeadByte(params)
          .then(() => {
            console.log("Customer created!!!!");
          })
          .catch((ERR) => {
            console.log("ERROR while creating customer");
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
      const details = await BusinessDetails.findOne({ _id: new ObjectId(id) });
      const userForActivity=await BusinessDetails.findById(id," -_id -createdAt -updatedAt").lean()

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
          });
          if (businesses.length > 0) {
            let array: mongoose.Types.ObjectId[] = [];
            businesses.map((i) => {
              array.push(i._id);
            });
            const bString = userData?.businessDetailsId.toString();

            const containsB = array.some((item) => item.toString() === bString);

            if (!containsB) {
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
        });
      }
      const data = await BusinessDetails.findByIdAndUpdate(id, input, {
        new: true,
      });
      const serviceDataForActivityLogs = await UserService.findOne({ userId: userData?.id },"-_id -__v -userId -createdAt -deletedAt -updatedAt");

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
         input.prices="";
      }
      if (input.avgInstallTime === "null") {
         input.avgInstallTime="";
      }
      if (input.trustpilotReviews === "null") {
         input.trustpilotReviews="";
      }
      if (input.criteria === "null") {
         input.criteria=[];
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
        const formattedPostCodes = leadData?.postCodeTargettingList
          .map((item: any) => item.postalCode)
          .flat();

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
        };
        send_email_for_updated_details(message);

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
          detailsType:"UPDATED DETAILS"
        };
        business_details_submission(messageToSendInBusinessSubmission);
        if (req.file && details.businessLogo) {
          DeleteFile(`${details.businessLogo}`);
        }
        const userAfterMod=await BusinessDetails.findById(id," -_id  -createdAt -updatedAt").lean()

        const fields = findUpdatedFields(userForActivity, userAfterMod);
        const userr=await User.findOne({businessDetailsId:req.params.id})
        const isEmpty = Object.keys(fields.updatedFields).length === 0;

        
        if(!isEmpty){const activity={
          //@ts-ignore
          actionBy:req?.user?.role,
          actionType:ACTION.UPDATING,
          targetModel:MODEL_ENUM.BUSINESS_DETAILS,
          //@ts-ignore
          userEntity:userr?.id,
          originalValues:fields.oldFields,
          modifiedValues:fields.updatedFields
        }
        await ActivityLogs.create(activity)}

        if(input.financeOffers || input.prices || input.accreditations || input.avgInstallTime || input.trustpilotReviews){
          const serviceData = await UserService.findOne({ userId: userData?.id },"-_id -userId -createdAt -deletedAt -__v -updatedAt");
          const fields = findModifiedFieldsForUserService(serviceDataForActivityLogs, serviceData);
          const isEmpty = Object.keys(fields.updatedFields).length === 0;
          if(!isEmpty){const activity={
            //@ts-ignore
            actionBy:req?.user?.role,
            actionType:ACTION.UPDATING,
            targetModel:MODEL_ENUM.USER_SERVICE_DETAILS,
            //@ts-ignore
            userEntity:userr?.id,
            originalValues:fields.oldFields,
            modifiedValues:fields.updatedFields
          }
          await ActivityLogs.create(activity)}
  
        }
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
    const currentUser = req.user;
    const Id = req.params.id;
    try {
      const data = await BusinessDetails.find({
        _id: Id,
        isDeleted: false,
      });

      if (
        //@ts-ignore
        currentUser?.role == RolesEnum.INVITED &&
        //@ts-ignore
        currentUser?.businessDetailsId != Id
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

  static nonBillableBusinessDetails = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;

    if (!input.userId) {
      return res
        .status(400)
        .json({ error: { message: "User Id is required" } });
    }
    const Business = new BusinessDetailsInput();
    (Business.businessIndustry = input.businessIndustry),
      (Business.businessName = input.businessName),
      //@ts-ignore
      // (Business.businessLogo = String(req.file?.filename)),
      (Business.businessSalesNumber = input.businessSalesNumber),
      (Business.address1 = input.address1),
      // (Business.businessAddress = input.businessAddress),
      (Business.businessCity = input.businessCity),
      // (Business.businessCountry = input.businessCountry),
      (Business.businessPostCode = input.businessPostCode);
    Business.businessOpeningHours = JSON.parse(input?.businessOpeningHours);
    const isBusinessNameExist = await BusinessDetails.findOne({
      businessName: input.businessName,
    });
    const user: any = await User.findById(input.userId);

    if (isBusinessNameExist) {
      return res
        .status(400)
        .json({ error: { message: "Business Name Already Exists." } });
    }
    // get onboarding value of user
  
    // input.businessOpeningHours=JSON.parse(input.businessOpeningHours)
    try {
      let dataToSave: any = {
        userId: input?.userId,
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
        //@ts-ignore
        dataToSave.businessLogo = `${FileEnum.PROFILEIMAGE}${req?.file.filename}`;
      }
      const userData = await BusinessDetails.create(dataToSave);

      const industry = await BuisnessIndustries.findOne({
        industry: input?.businessIndustry,
      });
   await LeadTablePreference.create({userId:input.userId, columns:industry?.columns})
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
      const params: any = {
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
      };
      const paramsObj = Object.values(params).some(
        (value: any) => value === undefined
      );
      if (!paramsObj) {
        createCustomerOnLeadByte(params)
          .then(() => {
            console.log("Customer created!!!!");
          })
          .catch((ERR) => {
            console.log("ERROR while creating customer");
          });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };
}
