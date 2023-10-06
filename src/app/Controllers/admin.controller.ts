import { Request, Response } from "express";
import { AdminSettings } from "../Models/AdminSettings";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { FAQ } from "../Models/Faq";
import { clientTablePreference } from "../../utils/constantFiles/clientTablePreferenceAdmin";
import { Notifications } from "../Models/Notifications";
import { generateAuthToken } from "../../utils/jwt";
import { User } from "../Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { AdminSettingsInterface } from "../../types/AdminSettingInterface";
import { ClientTablePreferenceInterface } from "../../types/clientTablePrefrenceInterface";
import { UserInterface } from "../../types/UserInterface";
import { columnsObjects } from "../../types/columnsInterface";
import mongoose from "mongoose";

interface QueryParams {
  userId: string;
}

export class AdminSettingsController {
  static create = async (req: Request, res: Response) => {
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

  static update = async (req: Request, res: Response) => {
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

  static show = async (req: Request, res: Response) => {
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
        return res.status(404).json({ data: { message: "Data not found" } });
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

  static createPreference = async (
    // req: Request<QueryParams, {}>,
    req: Request,
    res: Response
  ) => {
    const input = req.body;
    let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
    try {
      const checkExist = await ClientTablePreference.findOne();

      if (!checkExist) {
        const columns = input?.columns.sort(
          (a: columnsObjects, b: columnsObjects) => a.index - b.index
        );
        let dataToSave: Partial<ClientTablePreferenceInterface> =
          {
            columns,
            userId: user?._id,
          } ?? ({} as ClientTablePreferenceInterface);
        const Preference = await ClientTablePreference.create(dataToSave);
        return res.json({ data: Preference });
      } else {
        const data = await ClientTablePreference.findByIdAndUpdate(
          checkExist._id,
          { columns: input.columns, userId: user?._id },
          { new: true }
        ).lean();
        const col = data?.columns.sort(
          (a: columnsObjects, b: columnsObjects) => a.index - b.index
        );
        return res.json({ data: { ...data, columns: col } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static showClientTablePreference = async (
    // req: Request<QueryParams, {}, {}, Record<string, any>>,
    req: Request,
    res: Response
  ) => {
    try {
      let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);

      const Preference = await ClientTablePreference.findOne({
        userId: user?.id,
      });
      if (Preference) {
        Preference?.columns.sort(
          (a: columnsObjects, b: columnsObjects) => a.index - b.index
        );
        return res.json({ data: Preference });
      } else {
        const data = clientTablePreference;
        data?.sort((a: columnsObjects, b: columnsObjects) => a.index - b.index);
        return res.json({ data: { columns: data } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static notifications = async (
    req: Request<QueryParams, {}>,
    res: Response
  ): Promise<Response> => {
    let dataToFind: mongoose.FilterQuery<typeof Notifications> = {};

    try {
      if (req.query.start && req.query.end) {
        dataToFind.createdAt = {
          $gte: req.query.start,
          $lt: req.query.end,
        };
      }
      if (req.query.notificationType) {
        dataToFind.notificationType = req.query.notificationType;
      }
      if (req.query.userId) {
        // dataToFind.userId = new ObjectID(req.query.userId);
        dataToFind.userId = req.query.userId;
      }

      const data = await Notifications.find(dataToFind).sort({ createdAt: -1 });
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static userLogin = async (req: Request, res: Response) => {
    const input = req.body;
    const user: UserInterface =
      (await User.findOne({ email: input.email, role: RolesEnum.INVITED })) ??
      ({} as UserInterface);
    const token = generateAuthToken(user);
    return res.json({ token: token });
  };
}
