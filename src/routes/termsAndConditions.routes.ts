import { Router } from "express";

import { TermsAndConditionsController } from "../app/Controllers";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const TermsAndConditions: Router = Router();
TermsAndConditions.get(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.TERMS_AND_CONDITIONS, permission: PERMISSIONS.READ },
  ]),
  TermsAndConditionsController.show
);
TermsAndConditions.get("/file", TermsAndConditionsController.showFile);
TermsAndConditions.patch(
  "/",
  checkPermissions([
    { module: MODULE.TERMS_AND_CONDITIONS, permission: PERMISSIONS.UPDATE },
  ]),
  OnlyAdmins,
  TermsAndConditionsController.create
);

export default TermsAndConditions;
