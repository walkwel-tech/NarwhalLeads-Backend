import { Request, Response } from "express";
import { create } from "./Actions/createAdminSettingAction";
import { createFaqs } from "./Actions/createFaqAction";
import { createPermissions } from "./Actions/createPermissionAction";
import { createPlanPackages } from "./Actions/createPlanPackageAction";
import { createPreference } from "./Actions/createPreferenceAction";
import { createCustomerOnXero } from "./Actions/createXeroCustomerAction";
import { deleteAdminSettings } from "./Actions/deleteAdminSettingAction";
import { isXeroCustomer } from "./Actions/findXeroCustomerAction";
import { getFreeCreditsConfig } from "./Actions/getFreeCreditConfigAction";
import { notifications } from "./Actions/getNotificationAction";
import { getPlanPackages } from "./Actions/getPlanPackageAction";
import { show } from "./Actions/showAdminSettingAction";
import { showClientTablePreference } from "./Actions/showClientTablePreferenceAction";
import { showFaqs } from "./Actions/showFaqAction";
import { update } from "./Actions/updateAdminSettingAction";
import { updateFreeCreditsConfig } from "./Actions/updateFreeCreditConfigAction";
import { updatePermissions } from "./Actions/updatePermissionAction";


export class AdminSettingsController {
  static createAdminSetting = async (req: Request, res: Response) => {
    return create(req, res);
  };


  static createFaq = (req: Request, res: Response) => {
    return createFaqs(req, res);
  };

  static createPermission = async (req: Request, res: Response) => {
    return createPermissions(req, res);
  };

  static createPlanPackage = async (req: Request, res: Response) => {
    return createPlanPackages(req, res);
  };

  static createPreference = async (req: Request, res: Response) => {
    return createPreference(req, res);
  };

  static createXeroCust = async (req: Request, res: Response) => {
    return createCustomerOnXero(req, res);
  };

  static deleteAdminSetting = async (req: Request, res: Response) => {
    return deleteAdminSettings(req, res);
  };

  static getXeroCust = async (req: Request, res: Response) => {
    return isXeroCustomer(req, res);
  };

  static getFreeCreditsConfigs = async (req: Request, res: Response) => {
    return getFreeCreditsConfig(req, res);
  };

  static getnotifications = async (req: Request, res: Response) => {
    return notifications(req, res);
  };

  static getPlan = async (req: Request, res: Response) => {
    return getPlanPackages(req, res);
  };

  static getAdminSettings = async (req: Request, res: Response) => {
    return show(req, res);
  };

  static getClientTablePreferences = async (req: Request, res: Response) => {
    return showClientTablePreference(req, res);
  };

  static getFaqs = async (req: Request, res: Response) => {
    return showFaqs(req, res);
  };

  static updateAdminSettings = async (req: Request, res: Response) => {
    return update(req, res);
  };

  static updateFreeCredits = async (req: Request, res: Response) => {
    return updateFreeCreditsConfig(req, res);
  };

  static updatePermission = async (req: Request, res: Response) => {
    return updatePermissions(req, res);
  };


}
