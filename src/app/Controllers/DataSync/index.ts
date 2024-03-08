import { Request, Response } from "express";
import { getBusinessIndustriesActions } from "./Actions/getBusinessIndustries.action";
import { getUsersActions } from "./Actions/getUsers.actions";
import { generateDataSyncTokenAction } from "./Actions/generateDataSyncToken.action";
import { getTransactionActions } from "./Actions/getTransactions.actions";
import { getLeadsActions } from "./Actions/getLeads.action";

export class DataSyncController {
  static getIndustries = async (req: Request, res: Response) => {
    return getBusinessIndustriesActions(req, res);
  };

  static getUsers = async (req: Request, res: Response) => {
    return getUsersActions(req, res);
  };

  static getTransactions = async (req: Request, res: Response) => {
    return getTransactionActions(req, res);
  };

  static getLeads = async (req: Request, res: Response) => {
    return getLeadsActions(req, res);
  };

  static createToken = async (req: Request, res: Response) => {
    return generateDataSyncTokenAction(req, res)
  };
}
