import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { AdminSettings } from "../Models/AdminSettings";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { FAQ } from "../Models/Faq";

export class AdminSettingsController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    const salt = genSaltSync(10);
    const text =
      input.amount +
      "admin" +
      input.thresholdValue +
      "Secret" +
      input.defaultLeadAmount;
    const secretKey = hashSync(text, salt);
    let dataToSave: any = {
      amount: input.amount,
      leadByteKey: secretKey,
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

  static update = async (req: Request, res: Response) => {
    const input = req.body;
    try {
      const data = await AdminSettings.findOne();
      delete input.leadByteKey;
      const updatedData = await AdminSettings.findByIdAndUpdate(data?.id, {
        ...input,
      });
      return res.json({ message: "successfuly updated!", data: updatedData });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static show = async (req: Request, res: Response) => {
    try {
      const data = await AdminSettings.findOne();
      if (data) {
        return res.json({ data: data });
      } else {
        return res.json({ data: { message: "Data not found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static delete = async (req: Request, res: Response) => {
    try {
      await AdminSettings.deleteOne();

      return res.json({ data: { message: "Data deleted successfully" } });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showFaqs = async (req: Request, res: Response) => {
    try {
      const data = await FAQ.findOne();
      if (data) {
        return res.json({ data: data });
      } else {
        return res.json({ data: { message: "Data not found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static createFaqs = async (req: Request, res: Response) => {
    const input = req.body;
    try {
      await FAQ.updateOne(
        {},
        {
          content: input.content,
        },
        { new: true }
      );
      return res.json({ data: "FAQs Updated Successfully!" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static createPreference = async (req: Request, res: Response) => {
    //@ts-ignore
    const input = req.body;
    try {
      const checkExist = await ClientTablePreference.findOne();

      if (!checkExist) {
        //@ts-ignore
        const columns = input?.columns.sort((a, b) => a.index - b.index);
        let dataToSave: any = {
          columns,
        };
        const Preference = await ClientTablePreference.create(dataToSave);
        return res.json({ data: Preference });
      } else {
        const data = await ClientTablePreference.findByIdAndUpdate(
          checkExist._id,
          { columns: input.columns },
          { new: true }
        ).lean();
        //@ts-ignore
        const col = data?.columns.sort((a, b) => a.index - b.index);
        return res.json({ data: { ...data, columns: col } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static showClientTablePreference = async (req: Request, res: Response) => {
    //@ts-ignore
    try {
      const Preference = await ClientTablePreference.findOne()
      Preference?.columns.sort((a:any, b:any) => a.index - b.index);
      return res.json({ data: Preference });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };
}
