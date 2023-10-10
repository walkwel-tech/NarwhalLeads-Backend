import { Router } from "express";

import { nonBillableUsersController } from "../app/Controllers/nonBillableUser.controller";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const nonBillables: Router = Router();
nonBillables.post(
  "/",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.NON_BILLABLE, permission: PERMISSIONS.CREATE },
  ]),
  nonBillableUsersController.create
);
nonBillables.delete(
  "/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.NON_BILLABLE, permission: PERMISSIONS.DELETE },
  ]),
  nonBillableUsersController.delete
);
nonBillables.post(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.NON_BILLABLE, permission: PERMISSIONS.UPDATE },
  ]),
  nonBillableUsersController.update
);
nonBillables.get(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.NON_BILLABLE, permission: PERMISSIONS.READ },
  ]),
  nonBillableUsersController.show
);

export default nonBillables;
