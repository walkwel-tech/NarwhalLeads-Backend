import { Request, Response } from "express";
import { getBusinessIndustriesActions } from "./Actions/getBusinessIndustries.action";
import { getUsersActions } from "./Actions/getUsers.actions";
import { generateDataSyncTokenAction } from "./Actions/generateDataSyncToken.action";

export class DataSyncController {
  static getIndustries = async (req: Request, res: Response) => {
    return getBusinessIndustriesActions(req, res);
  };

  static getUsers = async (req: Request, res: Response) => {
    return getUsersActions(req, res);
  };

  static createToken = async (req: Request, res: Response) => {
    return generateDataSyncTokenAction(req, res)
  };
}
