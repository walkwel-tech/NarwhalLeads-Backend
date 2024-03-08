import { Request, Response } from "express";
import { genSaltSync } from "bcryptjs";
import { AuthKey } from "../../../Models/AuthKey";
import {UserInterface} from "../../../../types/UserInterface";
// import { UserInterface } from "@spotdif/types/UserInterface";

export const generateDataSyncTokenAction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {notes} = req.body
    const user = req.user as UserInterface;
    const salt = genSaltSync(10);

    const data = await AuthKey.create({
        userId: user.id,
        notes,
        key: salt,
    })

    res.json({data, message: "Key generated successfully"})
  } catch (err) {
    return res.status(500).json({
      error: { messsage: "Something went wrong", err },
    });
  }
};
