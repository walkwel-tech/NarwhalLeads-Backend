import { AdminSettingsInterface } from "../../../../types/AdminSettingInterface";
import { AdminSettings } from "../../../Models/AdminSettings";
import { Request, Response } from "express";

export const  create = async (req: Request, res: Response) => {
    const input = req.body;
    let dataToSave: Partial<AdminSettingsInterface> = {
      amount: input.amount,
      thresholdValue: input.thresholdValue,
      defaultLeadAmount: input.defaultLeadAmount,
    };
    try {
      const details = await AdminSettings.create(dataToSave);
      return res.json({ data: details });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };