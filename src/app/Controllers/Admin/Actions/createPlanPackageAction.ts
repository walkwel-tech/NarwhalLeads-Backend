import { PlanPackages } from "../../../Models/PlanPackages";
import { Request, Response } from "express";


export const createPlanPackages = async (req: Request, res: Response) => {
    try {
      const input = req.body;

      const data = await PlanPackages.create(input);
      return res.json({ data: data });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };