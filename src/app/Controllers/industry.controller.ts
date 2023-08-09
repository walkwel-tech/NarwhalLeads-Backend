import { Request, Response } from "express";
import { order } from "../../utils/constantFiles/businessIndustry.orderList";

import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { CustomColumnNames } from "../Models/CustomColumns.leads";
import { User } from "../Models/User";

export class IndustryController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    let dataToSave: any = {
      industry: input.industry,
      leadCost: input.leadCost,
      columns: order,
    };
    let array: any = [];
    order.forEach((i) => {
      let obj: any = {};
      obj.defaultColumn = i.name;
      obj.renamedColumn = "";
      array.push(obj);
    });

    try {
      const details = await BuisnessIndustries.create(dataToSave);
      await CustomColumnNames.create({
        industryId: details.id,
        columnsNames: array,
      });
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
      const updatedData = await BuisnessIndustries.findByIdAndUpdate(
        req.params.id,
        {
          ...input,
        },
        { new: true }
      );
      if (updatedData === null) {
        return res
          .status(404)
          .json({ error: { message: "Business Industry not found." } });
      }
      updatedData?.columns.sort((a: any, b: any) => a.index - b.index);

      if (input.leadCost) {
        await User.updateMany(
          { businessIndustryId: updatedData?.id },
          { leadCost: input.leadCost }
        );
      }

      return res.json({ data: updatedData });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static view = async (req: Request, res: Response) => {
    try {
      // const dataToFind={ $or: [
      //   //$options : 'i' used for case insensitivity search
      //   { industry: { $regex: req.query.search, $options: "i" } },
      //   // { leadCost: { $regex: req.query.search } },
      // ]}
      // console.log(dataToFind)
      const data = await BuisnessIndustries.find();
      data.map((i) => {
        i?.columns.sort((a: any, b: any) => a.index - b.index);
      });

      if (data) {
        return res.json({ data: data });
      } else {
        return res.json({ data: { message: "Data not found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static viewbyId = async (req: Request, res: Response) => {
    try {
      const data = await BuisnessIndustries.findById(req.params.id);

      data?.columns.sort((a: any, b: any) => a.index - b.index);

      return res.json({ data: data });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static delete = async (req: Request, res: Response) => {
    try {
      const data = await BuisnessIndustries.findByIdAndDelete(req.params.id);

      return res.json({ data: data });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showIndustries = async (req: Request, res: Response) => {
    try {
      const data = await BuisnessIndustries.find({isActive:true}, { industry: 1 });
      if (data) {
        let array: any = [];
        data.map((i) => {
          array.push(i.industry);
        });
        return res.json({ data: array });
      } else {
        return res.json({ data: { message: "Data not found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static renameCustomColumns = async (req: Request, res: Response) => {
    const input = req.body;
    const query = { industryId: req.params.id };
    let update = { columnsNames: input.columnsNames }; // update the city property of the address sub-document } }
    try {
      await CustomColumnNames.updateOne(query, update);
      const updatedData = await CustomColumnNames.find({
        industryId: req.params.id,
      });
      if (updatedData.length == 0 || !updatedData) {
        return res.status(400).json({ error: { message: "Data not found" } });
      }
      return res.json({ data: updatedData });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showCustomColumnsName = async (req: Request, res: Response) => {
    try {
      const updatedData = await CustomColumnNames.find({
        industryId: req.params.id,
      });
      if (updatedData.length == 0 || !updatedData) {
        return res.status(400).json({ error: { message: "Data not found" } });
      }
      return res.json({ data: updatedData });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}
