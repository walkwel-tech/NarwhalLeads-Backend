import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
import { signUpFlowEnums } from "../../utils/Enums/signupFlow.enum";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";

export class UserLeadsController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    let dataToSave: any = {
      userId: input.userId,
      total: input?.total,
      daily: input.daily,
      weekly: input?.weekly,
      monthly: input?.monthly,
      leadSchedule: input.leadSchedule,
      postCodeTargettingList: input.postcodeTargettingList,
      leadAlertsFrequency:leadsAlertsEnums.INSTANT,
    };
    try {
      const details = await UserLeadsDetails.create(dataToSave);
      await User.findByIdAndUpdate(input.userId, {
        userLeadsDetailsId: details._id,
        signUpFlowStatus:signUpFlowEnums.CARD_DETAILS_LEFT
      });
      return res.json({ data: details });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showById = async (req: Request, res: Response): Promise<any> => {
    const currentUser=req.user
    const Id = req.params.id;
    try {
           //@ts-ignore
      if(Id!=currentUser?.userLeadsDetailsId){
        return res
        .status(403)
        .json({ error: { message: "You dont't have access to this resource.!" } });
      }
      const data = await UserLeadsDetails.find({
        _id: Id,
        isDeleted: false,
      });
           //@ts-ignore
      if(currentUser?.role==RolesEnum.INVITED && currentUser?.userLeadsDetailsId!=Id){
        return res
        .status(403)
        .json({ error: { message: "You dont't have access to this resource.!" } });
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
    console.log("hello")

    const  id  = req.params.id;
    const input = req.body;
    try {
      const details = await UserLeadsDetails.findById(id)
      if (!details) {
        return res
          .status(404)
          .json({ error: { message: "details does not exists." } });
      }
      const data = await UserLeadsDetails.findByIdAndUpdate(
        id,
        {...input
        },
        {
          new: true,
        }
      );
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
