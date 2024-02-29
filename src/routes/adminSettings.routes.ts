import { Router } from "express";

import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";
import { AdminSettingsController } from "../app/Controllers/Admin";
const adminSettingsRoutes: Router = Router();

adminSettingsRoutes.post("/", OnlyAdmins, AdminSettingsController.createAdminSetting);
adminSettingsRoutes.post(
  "/permissions",
  OnlyAdmins,
  AdminSettingsController.createPermission
);
adminSettingsRoutes.post("/xero/contact/:id",OnlyAdmins, AdminSettingsController.createXeroCust)
adminSettingsRoutes.get("/xero/contact/:id",OnlyAdmins, AdminSettingsController.getXeroCust);
adminSettingsRoutes.patch("/", OnlyAdmins, AdminSettingsController.updateAdminSettings);
adminSettingsRoutes.get("/", OnlyAdmins, AdminSettingsController.getAdminSettings);
adminSettingsRoutes.get("/notifications", AdminSettingsController.getnotifications);
adminSettingsRoutes.get(
  "/clientColumnsPreference",
  Auth,
  AdminSettingsController.getClientTablePreferences
);
adminSettingsRoutes.post(
  "/clientColumnsPreference",
  Auth,
  AdminSettingsController.createPreference
);
adminSettingsRoutes.get("/FAQs", Auth, AdminSettingsController.getFaqs);
adminSettingsRoutes.patch("/FAQs", OnlyAdmins, AdminSettingsController.createFaq);
adminSettingsRoutes.delete("/", OnlyAdmins, AdminSettingsController.deleteAdminSetting);
// adminSettings.post("/user-login", AdminSettingsController.userLogin);
adminSettingsRoutes.post(
  "/update-permissions",
  OnlyAdmins,
  AdminSettingsController.updatePermission
);
adminSettingsRoutes.post(
  "/plan-packages",
  Auth,
  AdminSettingsController.createPlanPackage
);

adminSettingsRoutes.get(
  "/plan-packages",
  Auth,
  AdminSettingsController.getPlan
);

adminSettingsRoutes.get(
  "/site-configs",
  Auth,
  checkPermissions([
    { module: MODULE.FREE_CREDITS_CONFIG, permission: PERMISSIONS.READ },
  ]),
  AdminSettingsController.getFreeCreditsConfigs
);

adminSettingsRoutes.post(
  "/site-configs",
  Auth,
  checkPermissions([
    { module: MODULE.FREE_CREDITS_CONFIG, permission: PERMISSIONS.UPDATE },
  ]),
  AdminSettingsController.updateFreeCredits
);

export default adminSettingsRoutes;
