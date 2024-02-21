import { Request, Response } from "express";
import { Permissions } from "../../../Models/Permission";


export const createPermissions = async (req: Request, res: Response) => {
    try {
      const input = req.body;
      const permission = await Permissions.create(input);
      return res.json({ data: permission });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };
