import { Request, Response } from "express";
import { createUserAction } from "./Actions/createUser.actions";
import { getUsersActions } from "./Actions/getUsers.action";
import { getUsersV2Actions } from "./Actions/getUsersV2.action";
import { showAllClientsForAdminExportFileV2Action } from "./Actions/showAllClientsForAdminExportFileV2.actions";
import { showAction } from "./Actions/show.action";
import { indexNameV2Action } from "./Actions/indexName.action";
import { updateAction } from "./Actions/Update.action";
import { destroyAction } from "./Actions/destroy.action";
import { reOrderIndexAction } from "./Actions/reOrderIndex.action";
import { invoicesActions } from "./Actions/invoices.action";
import { showAllClientsForAdminExportFileAction } from "./Actions/showAllClientsForAdminExportFile.action";
import { accountManagerStatsAction } from "./Actions/accountManagerStats.action";
import { userCreditsManualAdjustmentAction } from "./Actions/userCreditsManualAdjustment.action";
import { clientsStatsV2Action } from "./Actions/clientStatsV2.action";
import { clientsStatAction } from "./Actions/clientsStat.action";
import { sendTestLeadDataAction } from "./Actions/sendTestLeadData.action";
import { autoChargeNowAction } from "./Actions/autoChargeNow.action";
import { updateEmailAction } from "./Actions/updateEmail.action";
import { updateClientsStatusAction } from "./Actions/updateClientsStatus.action";

export class UsersControllersV2 {
  static create = async (req: Request, res: Response): Promise<Response> => {
    return createUserAction(req, res);
  };

  static index = async (req: Request, res: Response): Promise<Response> => {
    return getUsersActions(req, res);
  };

  static indexV2 = async (req: Request, res: Response): Promise<Response> => {
    return getUsersV2Actions(req, res);
  };

  static showAllClientsForAdminExportFileV2 = async (req: Request, res: Response) => {
    return showAllClientsForAdminExportFileV2Action(req, res)
  }

  static show = async (req: Request, res: Response) => {
    return showAction(req, res)
  }

  static indexName = async(req: Request, res: Response) => {
    return indexNameV2Action(req, res)
  }

  static update = async(req: Request, res: Response) => {
    return updateAction(req, res)
  }

  static destroy = async(req: Request, res: Response) => {
    return destroyAction(req, res)
  }
  
  static reOrderIndex = async(req: Request, res: Response) => {
    return reOrderIndexAction(req, res)
  }

  static invoices = async(req: Request, res: Response) => {
    return invoicesActions(req, res)
  }

  static showAllClientsForAdminExportFile = async(req: Request, res: Response) => {
    return showAllClientsForAdminExportFileAction(req, res)
  }

  static accountManagerStats = async(req: Request, res: Response) => {
    return accountManagerStatsAction(req, res)
  }

  static userCreditsManualAdjustment = async(req: Request, res: Response) => {
    return userCreditsManualAdjustmentAction(req, res)
  }

  static clientsStatsV2 = async(req: Request, res: Response) => {
    return clientsStatsV2Action(req, res)
  }

  static clientsStat = async(req: Request, res: Response) => {
    return clientsStatAction(req, res)
  }

  static sendTestLeadData = async(req: Request, res: Response) => {
    return sendTestLeadDataAction(req, res)
  }

  static autoChargeNow = async(req: Request, res: Response) => {
    return autoChargeNowAction(req, res)
  }

  static updateEmail = async(req: Request, res: Response) => {
    return updateEmailAction(req, res)
  }

  static updateClientsStatus = async(req: Request, res: Response) => {
    return updateClientsStatusAction(req, res)
  }

  



}
