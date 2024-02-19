import { Router } from "express";

import { AdminSettingsController } from "../app/Controllers/admin.controller";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";
const adminSettings: Router = Router();

adminSettings.post("/", OnlyAdmins, AdminSettingsController.create);
adminSettings.post(
  "/permissions",
  OnlyAdmins,
  AdminSettingsController.createPermissions
);
adminSettings.post("/xero/contact/:id",OnlyAdmins, AdminSettingsController.createCustomerOnXero)
adminSettings.get("/isXero/contact/:id",OnlyAdmins, AdminSettingsController.isXeroCustomer);
adminSettings.patch("/", OnlyAdmins, AdminSettingsController.update);
adminSettings.get("/", OnlyAdmins, AdminSettingsController.show);
adminSettings.get("/notifications", AdminSettingsController.notifications);
adminSettings.get(
  "/clientColumnsPreference",
  Auth,
  AdminSettingsController.showClientTablePreference
);
adminSettings.post(
  "/clientColumnsPreference",
  Auth,
  AdminSettingsController.createPreference
);
adminSettings.get("/FAQs", Auth, AdminSettingsController.showFaqs);
adminSettings.patch("/FAQs", OnlyAdmins, AdminSettingsController.createFaqs);
adminSettings.delete("/", OnlyAdmins, AdminSettingsController.delete);
adminSettings.post("/user-login", AdminSettingsController.userLogin);
adminSettings.post(
  "/update-permissions",
  OnlyAdmins,
  AdminSettingsController.updatePermissions
);
adminSettings.post(
  "/plan-packages",
  Auth,
  AdminSettingsController.createPlanPackages
);

adminSettings.get(
  "/plan-packages",
  Auth,
  AdminSettingsController.getPlanPackages
);

adminSettings.get(
  "/site-configs",
  Auth,
  checkPermissions([
    { module: MODULE.FREE_CREDITS_CONFIG, permission: PERMISSIONS.READ },
  ]),
  AdminSettingsController.getFreeCreditsConfig
);

adminSettings.post(
  "/site-configs",
  Auth,
  checkPermissions([
    { module: MODULE.FREE_CREDITS_CONFIG, permission: PERMISSIONS.UPDATE },
  ]),
  AdminSettingsController.updateFreeCreditsConfig
);

export default adminSettings;
