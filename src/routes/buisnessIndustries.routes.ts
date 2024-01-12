import { Router } from "express";
import { IndustryController } from "../app/Controllers/industry.controller";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";
const industry: Router = Router();
industry.get("/currency", Auth, IndustryController.getCurrency);
industry.post(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.UPDATE },
  ]),
  IndustryController.update
);
industry.patch(
  "/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.UPDATE },
  ]),
  IndustryController.update
);
industry.post(
  "/",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.CREATE },
  ]),
  IndustryController.create
);
industry.get(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.READ },
  ]),
  IndustryController.view
);
industry.get(
  "/stats",
  Auth,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.READ },
  ]),
  IndustryController.stats
);
industry.get(
  "/industry",
  Auth,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.READ },
  ]),
  IndustryController.showIndustries
);
industry.delete(
  "/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.DELETE },
  ]),
  IndustryController.delete
);
industry.get(
  "/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.BUSINESS_INDUSTRIES, permission: PERMISSIONS.READ },
  ]),
  IndustryController.viewbyId
);

export default industry;
