import { AdminSettingsInterface } from "../../../../types/AdminSettingInterface";
import { AdminSettings } from "../../../Models/AdminSettings";
import { Request, Response } from "express";


export const update = async (req: Request, res: Response) => {
    const input = req.body;
    try {
      const data = await AdminSettings.findOne();
      delete input?.leadByteKey;
      if (data) {
        const updatedData = await AdminSettings.findByIdAndUpdate(data?.id, {
          ...input,
        });
        return res.json({ message: "successfuly updated!", data: updatedData });
      } else {
        let dataToSave: Partial<AdminSettingsInterface> = {
          amount: input.amount,
          thresholdValue: input.thresholdValue,
          defaultLeadAmount: input.defaultLeadAmount,
          minimumUserTopUpAmount: "",
        };
        await AdminSettings.create(dataToSave);
        return res.json({ message: "successfuly Created!", data: dataToSave });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };