import { Request, Response } from "express";
import { order } from "../../utils/constantFiles/businessIndustry.orderList";

import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { CustomColumnNames } from "../Models/CustomColumns.leads";
import { User } from "../Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { IndustryInput } from "../Inputs/Industry.input";
import { validate } from "class-validator";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
const LIMIT = 10;
export class IndustryController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    const Industry=new IndustryInput()
    Industry.industry=input.industry
    Industry.leadCost=input.leadCost

    const errors = await validate(Industry);

    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      return res
        .status(400)
        .json({ error: { message: "VALIDATIONS_ERROR", info: errorsInfo } });
    }
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
      const exist=await BuisnessIndustries.find({industry:input.industry})
      if(exist.length>0){
        return res
        .status(400)
        .json({ error: { message: "Business Industry should be unique." } });
      }
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
      if (input.columnsNames) {
        input.columnsNames.forEach((i: any) => {
          if (i.defaultColumn == "") {
            i.defaultColumn = i.renamedColumn;
          }
          return i;
        });
      }
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
      const sortField: any = req.query.sort || "industry"; // Change this field name as needed

      let sortOrder: any = req.query.order || 1; // Change this as needed

      const perPage =
        //@ts-ignore
        req.query && req.query?.perPage > 0
          ? //@ts-ignore
            parseInt(req.query?.perPage)
          : LIMIT;

      let skip =
        //@ts-ignore
        (req.query && req.query.page > 0 ? parseInt(req.query.page) - 1 : 0) *
        perPage;
      if (sortOrder == "asc") {
        sortOrder = 1;
      } else {
        sortOrder = -1;
      }
      let dataToFind = {};
      if (req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [{ industry: { $regex: req.query.search, $options: "i" } }],
        };
      }
      const sortObject: Record<string, 1 | -1> = {};
      sortObject[sortField] = sortOrder;
      let data = await BuisnessIndustries.find(dataToFind)
        .collation({ locale: "en" })
        .sort(sortObject)
        .skip(skip)
        .limit(perPage);
        const dataWithoutPagination = await BuisnessIndustries.find(dataToFind)
        .collation({ locale: "en" })
        .sort({industry:1})
      data.map((i) => {
        i?.columns.sort((a: any, b: any) => a.index - b.index);
      });
      const totalPages = Math.ceil(dataWithoutPagination.length / perPage);

      if (data && req.query.perPage) {
        let dataToShow={
          data: data,
          meta: {
            perPage: perPage,
            page: req.query.page || 1,
            pages: totalPages,
            total: dataWithoutPagination.length,
          },
        }
        return res.json(dataToShow);
      }
      else if(data && !req.query.perPage) {
        let dataToShow={
          data: dataWithoutPagination
        }
        return res.json(dataToShow);
      }
        else {
        return res.status(404).json({ data: { message: "Data not found" } });
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
      const users = await User.find({ businessIndustryId: req.params.id, isDeleted:false, role:RolesEnum.USER });
      if(users.length>0){
        return res
        .status(400)
        .json({ error: { message: "Users already registered with this industry. kindly first delete those users." } });
      }
      else{
        const data = await BuisnessIndustries.findByIdAndDelete(req.params.id);
        return res.json({ data: data });

      }
    
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showIndustries = async (req: Request, res: Response) => {
    try {
      const data = await BuisnessIndustries.find(
        { isActive: true },
        { industry: 1 }
      );
      if (data) {
        let array: any = [];
        data.map((i) => {
          array.push(i.industry);
        });
        return res.json({ data: array });
      } else {
        return res.status(404).json({ data: { message: "Data not found" } });
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
        return res.status(404).json({ error: { message: "Data not found" } });
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
        return res.status(404).json({ error: { message: "Data not found" } });
      }
      return res.json({ data: updatedData });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}
