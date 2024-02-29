import { PlanPackages } from "../../../Models/PlanPackages";
import { Request, Response } from "express";


export const getPlanPackages = async (req: Request, res: Response) => {
    try {
      const data = await PlanPackages.find();
      return res.json({ data: data });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };