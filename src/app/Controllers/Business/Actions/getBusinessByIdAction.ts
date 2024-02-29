import { RolesEnum } from "../../../../types/RolesEnum";
import { UserInterface } from "../../../../types/UserInterface";
import { BusinessDetails } from "../../../Models/BusinessDetails";
import { User } from "../../../Models/User";
import { Request, Response } from "express";
import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;



export const showById = async (req: Request, res: Response): Promise<any> => {
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