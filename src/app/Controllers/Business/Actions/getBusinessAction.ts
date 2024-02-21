import { BusinessDetails } from "../../../Models/BusinessDetails";
import { Request, Response } from "express";

export const show = async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await BusinessDetails.find({ isDeleted: false });
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };