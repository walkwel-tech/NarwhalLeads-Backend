import { AdminSettings } from "../../../Models/AdminSettings";
import { Request, Response } from "express";

export const show = async (req: Request, res: Response) => {
    try {
      const data = await AdminSettings.findOne();
      if (data) {
        return res.json({ data: data });
      } else {
        return res.status(404).json({ data: { message: "Data not found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
    
  };


