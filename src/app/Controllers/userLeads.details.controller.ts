import { validate } from "class-validator";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
import { checkOnbOardingComplete } from "../../utils/Functions/Onboarding_complete";
import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import { UserLeadDetailsInput } from "../Inputs/user.leadDetails.input";
import {
  send_email_for_new_registration,
  send_email_for_updated_details,
} from "../Middlewares/mail";
import { BusinessDetails } from "../Models/BusinessDetails";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { PROMO_LINK } from "../../utils/Enums/promoLink.enum";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { UserService } from "../Models/UserService";

export class UserLeadsController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    if(!input.userId){
      return res
      .status(400)
      .json({ error: { message: "User Id is required" } });
    }
    const leadDetailsInput = new UserLeadDetailsInput();
    (leadDetailsInput.daily = input.daily),
      (leadDetailsInput.leadSchedule = input.leadSchedule),
      (leadDetailsInput.postCodeTargettingList = input.postCodeTargettingList);
    const errors = await validate(leadDetailsInput);
    const { onBoarding }: any = await User.findById(input.userId);
    let object = onBoarding || [];
    let array: any = [];
    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));
      errorsInfo.map((i) => {
        array.push(i.property);
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
    const serviceData=await UserService.findOne({userId:input.userId})
    const service = await UserService.findByIdAndUpdate(serviceData?.id,input,{new:true})
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
      return res
        .status(400)
        .json({
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
    };
    try {
      const details = await UserLeadsDetails.create(dataToSave);
      await User.findByIdAndUpdate(input.userId, {
        userLeadsDetailsId: details._id,
        onBoardingPercentage:input?.onBoardingPercentage
      });
      if (checkOnbOardingComplete(user) && !user.registrationMailSentToAdmin) {
        const leadData = await UserLeadsDetails.findOne({ userId: user?._id });
        const businessDeatilsData = await BusinessDetails.findById(
          user?.businessDetailsId
        );
        const formattedPostCodes=leadData?.postCodeTargettingList.map((item:any) => item.postalCode).flat();

        const message = {
          firstName: user?.firstName,
          lastName: user?.lastName,
          businessName: businessDeatilsData?.businessName,
          phone: businessDeatilsData?.businessSalesNumber,
          email: user?.email,
          industry: businessDeatilsData?.businessIndustry,
          address:
            businessDeatilsData?.address1 + " " + businessDeatilsData?.address2,
          city: businessDeatilsData?.businessCity,
          country: businessDeatilsData?.businessCountry,
          // openingHours: formattedOpeningHours,
          openingHours:businessDeatilsData?.businessOpeningHours,
          totalLeads: leadData?.total,
          monthlyLeads: leadData?.monthly,
          weeklyLeads: leadData?.weekly,
          dailyLeads: leadData?.daily,
          // leadsHours: formattedLeadSchedule,
          leadsHours:leadData?.leadSchedule,
          area: `${formattedPostCodes}`,
        };
        send_email_for_new_registration(message);
        await User.findByIdAndUpdate(user.id, {
          registrationMailSentToAdmin: true,
        });
      }
      if(user.premiumUser && user.premiumUser==PROMO_LINK.PREMIUM_USER_NO_TOP_UP){
              const promoLink=await FreeCreditsLink.findById(user?.promoLinkId)
              const params={
                buyerId:user.buyerId,
                freeCredits:promoLink?.freeCredits
              }
              addCreditsToBuyer(params).then((_res)=>{
                console.log("FREE CREDITS ADDED WITH SIGNUP CODE")
              }).catch((error)=>{
                console.log("ERROR DURING ADDING FREE CREDITS WITH SIGNUP CODE")
              })


      }
      return res.json({ data: details,service });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.",error } });
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
    try {
      const details = await UserLeadsDetails.findById(id);
      const user: any = await User.findById(details?.userId);
      if(input.zapierUrl){
        await UserLeadsDetails.findByIdAndUpdate(
          user?.userLeadsDetailsId,
          { zapierUrl: input.zapierUrl, sendDataToZapier:true },

          { new: true }
        );      }
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
      const serviceData=await UserService.findOne({userId:user.id})
      const service = await UserService.findByIdAndUpdate(serviceData?.id,input,{new:true})
      if (input.daily) {
        await UserLeadsDetails.findByIdAndUpdate(id, {
          dailyLeadCost: user?.leadCost * input.daily,
        });
      }
      if (data) {
        const updatedDetails = await UserLeadsDetails.findById(id);
        const userData = await User.findOne({ userLeadsDetailsId: id });
        const businessDeatilsData = await BusinessDetails.findById(
          userData?.businessDetailsId
        );
        const formattedPostCodes=updatedDetails?.postCodeTargettingList.map((item:any) => item.postalCode).flat();

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
          openingHours:businessDeatilsData?.businessOpeningHours,
          logo:businessDeatilsData?.businessLogo,
          totalLeads: updatedDetails?.total,
          monthlyLeads: updatedDetails?.monthly,
          weeklyLeads: updatedDetails?.weekly,
          dailyLeads: updatedDetails?.daily,
          leadsHours:updatedDetails?.leadSchedule,
          // leadsHours:formattedLeadSchedule,
          area: `${formattedPostCodes}`,
        };
        send_email_for_updated_details(message);
        return res.json({
          data: {
            message: "UserLeadsDetails updated successfully.",
            data: updatedDetails,service
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
}
