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
// import { columnsObjects } from "../../types/columnsInterface";
import mongoose from "mongoose";
import { Permissions } from "../Models/Permission";
import { PlanPackages } from "../Models/PlanPackages";
import { FreeCreditsConfig } from "../Models/FreeCreditsConfig";
import { FirstCardBonusInterface } from "../../types/FirstCardBonusInterface";

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
      const checkExist = await ClientTablePreference.findOne({
        userId: user.id,
      });
      if (!checkExist) {
        const columns = input?.columns;
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
        const col = data?.columns;
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
        return res.json({ data: Preference });
      } else {
        const data = clientTablePreference;
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
    try {
      const input = req.body;
      const user: UserInterface =
        (await User.findOne({ email: input.email, role: RolesEnum.USER })) ??
        ({} as UserInterface);
      const token = generateAuthToken(user);
      return res.json({ token: token });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static createPermissions = async (req: Request, res: Response) => {
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

  static updatePermissions = async (req: Request, res: Response) => {
    try {
      const input = req.body;
      const role = input.role;
      const permission = await Permissions.findOne({ role: role });
      if (permission) {
        const modulePermissions = permission.permissions?.find(
          (p: any) => p.module === module
        );
        if (modulePermissions) {
          permission.permissions.push(input.permission);
          await Permissions.findOneAndUpdate(
            { role: input.role },
            { permissions: permission.permissions }
          );
        } else {
          permission.permissions.push({
            module: input.module,
            permission: input.permission,
          });
          await Permissions.findOneAndUpdate(
            { role: input.role },
            { permissions: permission.permissions }
          );
        }
      }

      return res.json({ data: permission });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static createPlanPackages = async (req: Request, res: Response) => {
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

  static getPlanPackages = async (req: Request, res: Response) => {
    try {
      const data = await PlanPackages.find();
      return res.json({ data: data });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static getFreeCreditsConfig = async (req: Request, res: Response) => {
    try {
      const data = await FreeCreditsConfig.aggregate([
        {
            $replaceRoot: {
                newRoot: {
                    $arrayToObject: [
                        [{
                            k: "$tag",
                            v: {
                                enabled: "$enabled",
                                amount: "$amount"
                            }
                        }]
                    ]
                }
            }
        },
    ]);
 
    const result = Object.assign({}, ...data);
   
      return res.json({ data: result });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };
 
  static updateFreeCreditsConfig = async (req: Request, res: Response) => {
    try{
      const { enabled, amount, tags } = req.body as FirstCardBonusInterface ;
      // console.log(firstCardBonus, ">>>" , req.body)
      let options = {upsert: true, new: true, setDefaultsOnInsert: true};
      await FreeCreditsConfig.findOneAndUpdate({tag: "firstCardBonus"},  {enabled, amount, tags}, options);
 
      return res
      .status(200)
      .json({ message: "Site config updated successfully." });
 
    } catch (error) {
      console.log(error, ">>>>>>> error")
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  }
}
