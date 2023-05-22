import { validate } from "class-validator";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
import { UserLeadDetailsInput } from "../Inputs/user.leadDetails.input";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";

export class UserLeadsController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    const leadDetailsInput = new UserLeadDetailsInput();
    (leadDetailsInput.daily = input.daily),
    (leadDetailsInput.leadSchedule = input.leadSchedule),
    (leadDetailsInput.postCodeTargettingList = input.postCodeTargettingList);
    const errors = await validate(leadDetailsInput)
    const { onBoarding }: any = await User.findById(input.userId);
    let object = onBoarding || [];
    let array:any=[]
    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));
      errorsInfo.map((i) => {
    
        array.push(i.property)
       
      });
     const existLead=object.find((item:any) => item.key === ONBOARDING_KEYS.LEAD_DETAILS)
     if(existLead){
      existLead.pendingFields=array
      object = object.map((obj:any) => (obj.key === existLead.key ? existLead : obj));
      // object.push(existLead)
     }
     else{
       const mock={
        key:ONBOARDING_KEYS.LEAD_DETAILS,
        pendingFields:array,
        dependencies:["businessIndustry"]
      }
      object.push(mock)
     }
     
    }
    await User.findByIdAndUpdate(input.userId,{onBoarding:object})

    const leadDetails = object.find((item:any) => item.key === ONBOARDING_KEYS.LEAD_DETAILS);
    // Find the businessDetails objectect
    const businessDetails = object.find((item:any) => item.key === ONBOARDING_KEYS.BUSINESS_DETAILS);
    
    // if (leadDetails && businessDetails) {
      const leadDependencyFields = leadDetails?.dependencies || [];
      const businessPendingFields = businessDetails?.pendingFields || [];
      const valuesPresent = leadDependencyFields.every((field:any) => businessPendingFields.includes(field));
      if(valuesPresent){
        return res
        .status(400)
        .json({ error: { message: `${leadDependencyFields} is required to fill the daily LeadCost` } });      }
    // } 
    const user = await User.findById(input.userId);
   
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
      });
      return res.json({ data: details });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showById = async (req: Request, res: Response): Promise<any> => {
    const currentUser = req.user;
    const Id = req.params.id;
    try {
      //@ts-ignore
      if (Id != currentUser?.userLeadsDetailsId) {
        return res
          .status(403)
          .json({
            error: { message: "You dont't have access to this resource.!" },
          });
      }
      const data = await UserLeadsDetails.find({
        _id: Id,
        isDeleted: false,
      });
      if (      //@ts-ignore

        currentUser?.role == RolesEnum.INVITED &&
              //@ts-ignore

        currentUser?.userLeadsDetailsId != Id
      ) {
        return res
          .status(403)
          .json({
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
    console.log("hello");

    const id = req.params.id;
    const input = req.body;
    try {
      const details = await UserLeadsDetails.findById(id);
      const user: any = await User.findById(details?.userId);
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
      if (input.daily) {
        await UserLeadsDetails.findByIdAndUpdate(id, {
          dailyLeadCost: user?.leadCost * input.daily,
        });
      }
      if (data) {
        const updatedDetails = await UserLeadsDetails.findById(id);
        return res.json({
          data: {
            message: "UserLeadsDetails updated successfully.",
            data: updatedDetails,
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