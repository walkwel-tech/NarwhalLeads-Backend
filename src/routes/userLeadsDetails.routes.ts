import { Router } from "express";
// import multer from "multer";

import { UserLeadsController } from "../app/Controllers/userLeads.details.controller";
import { Auth } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const userLeadsDetails: Router = Router();
userLeadsDetails.patch(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.UPDATE },
  ]),
  UserLeadsController.updateLeadDetails
);
userLeadsDetails.post(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.UPDATE },
  ]),
  UserLeadsController.updateLeadDetails
);
userLeadsDetails.delete(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.DELETE },
  ]),
  UserLeadsController.delete
);
userLeadsDetails.post(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.CREATE },
  ]),
  UserLeadsController.create
);
userLeadsDetails.get(
  "/",
  Auth,
  checkPermissions([{ module: MODULE.PROFILE, permission: PERMISSIONS.READ }]),
  UserLeadsController.show
);
userLeadsDetails.get(
  "/:id",
  Auth,
  checkPermissions([{ module: MODULE.PROFILE, permission: PERMISSIONS.READ }]),
  UserLeadsController.showById
);

export default userLeadsDetails;
