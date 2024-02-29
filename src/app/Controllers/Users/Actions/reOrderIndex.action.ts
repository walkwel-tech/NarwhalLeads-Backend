import { Request, Response } from "express";
import { User } from "../../../Models/User";

export const reOrderIndexAction = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    try {
      input.forEach(async (key: { _id: any; rowIndex: any }) => {
        await User.findByIdAndUpdate(
          { _id: key._id },
          { rowIndex: key.rowIndex },
          { new: true }
        );
      });
      return res.json({ data: { message: "user list re-ordered!" } });
    } catch {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };