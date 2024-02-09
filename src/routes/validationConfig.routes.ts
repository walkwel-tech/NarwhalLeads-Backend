import { Router } from "express";
import { ValidationConfigController } from "../app/Controllers/validationConfigs.controller";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";


const validationConfigRoutes: Router = Router();

validationConfigRoutes.get(
  "/:key",
  Auth,
  ValidationConfigController.getValidation
);

validationConfigRoutes.patch(
  "/:key",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.VALIDATION_CONFIG, permission: PERMISSIONS.UPDATE },
  ]),
  ValidationConfigController.updateValidation
);

export default validationConfigRoutes;
