import { Request, Response } from "express";
import { UserService } from "../Models/UserService";
import { User } from "../Models/User";

export class UserServiceController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;

    const dataToSave = {
      userId: req?.user,
      ...input,
    };
    try {
      const details = await UserService.create(dataToSave);
      await User.findByIdAndUpdate( req?.user,{userServiceId:details.id})

      return res.json({ data: details });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}
