import { BuisnessIndustriesInterface } from "../../../../types/BuisnessIndustriesInterface";
import { BusinessDetailsInterface } from "../../../../types/BusinessInterface";
import { FileEnum } from "../../../../types/FileEnum";
import { UserInterface } from "../../../../types/UserInterface";
import { additionalColumnsForLeads } from "../../../../utils/constantFiles/additionalColumnsOnClientLeadsTable";
import { createCustomerOnLeadByte } from "../../../../utils/createCustomer/createOnLeadByte";
import { BusinessDetailsInput } from "../../../Inputs/BusinessDetails.input";
import { CreateCustomerInput } from "../../../Inputs/createCustomerOnRyft&Lead.inputs";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import { BusinessDetails } from "../../../Models/BusinessDetails";
import { LeadTablePreference } from "../../../Models/LeadTablePreference";
import { User } from "../../../Models/User";
import { UserService } from "../../../Models/UserService";
import { Request, Response } from "express";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;


export const nonBillableBusinessDetails = async (
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