import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { AdminSettings } from "../Models/AdminSettings";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { FAQ } from "../Models/Faq";
import { clientTablePreference } from "../../utils/constantFiles/clientTablePreferenceAdmin";
import { Notifications } from "../Models/Notifications";
import { ObjectID } from "bson";

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
      delete input?.leadByteKey;
      if (data) {
        const updatedData = await AdminSettings.findByIdAndUpdate(data?.id, {
          ...input,
        });
        return res.json({ message: "successfuly updated!", data: updatedData });
      }
      else {
        let dataToSave: any = {
          amount: input.amount,
          thresholdValue: input.thresholdValue,
          defaultLeadAmount: input.defaultLeadAmount,
          minimumUserTopUpAmount: ""

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
          //@ts-ignore
          userId:req.user?.id
        };
        const Preference = await ClientTablePreference.create(dataToSave);
        return res.json({ data: Preference });
      } else {
        const data = await ClientTablePreference.findByIdAndUpdate(
          checkExist._id,
          //@ts-ignore
          { columns: input.columns,userId:req.user.id },
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

    try {
          //@ts-ignore
      const Preference = await ClientTablePreference.findOne({userId:req.user.id})
      if(Preference){
        Preference?.columns.sort((a: any, b: any) => a.index - b.index);
        return res.json({ data: Preference });
      }
     else{
      const data=clientTablePreference
      data?.sort((a: any, b: any) => a.index - b.index);
      return res.json({ data:  {columns:data}  });
     }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
      }
  };

  static notifications = async (
    req: any,
    res: Response
  ): Promise<Response> => {
    let dataToFind={}
    try {
      if(req.query.start && req.query.end){
        //@ts-ignore
  dataToFind.createdAt={
    $gte: req.query.start,
    $lt: req.query.end
  }
      }
  if(req.query.notificationType){
          //@ts-ignore
    dataToFind.notificationType=req.query.notificationType
  }
  if(req.query.userId){
          //@ts-ignore
    dataToFind.userId=new ObjectID(req.query.userId)
  }
  
      const data= await  Notifications.find(dataToFind).sort({createdAt:-1})
      return res.json({data:data})
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

}
