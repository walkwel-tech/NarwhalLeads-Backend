import { Router } from "express";

import { invitedUsersController } from "../app/Controllers";
import { Auth } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const invites: Router = Router();
invites.post(
  "/admin",
  Auth,
  checkPermissions([{ module: MODULE.ADMINS, permission: PERMISSIONS.CREATE }]),
  invitedUsersController.addAdmins
);
invites.delete(
  "/admin/:id",
  Auth,
  checkPermissions([{ module: MODULE.ADMINS, permission: PERMISSIONS.DELETE }]),
  invitedUsersController.deleteAdmin
);
invites.post(
  "/admin/:id",
  Auth,
  checkPermissions([{ module: MODULE.ADMINS, permission: PERMISSIONS.UPDATE }]),
  invitedUsersController.updateAdmin
);
invites.get(
  "/admin",
  Auth,
  checkPermissions([{ module: MODULE.ADMINS, permission: PERMISSIONS.READ }]),
  invitedUsersController.indexAdmin
);
invites.post(
  "/subscriber",
  Auth,
  checkPermissions([
    { module: MODULE.SUBSCRIBERS, permission: PERMISSIONS.CREATE },
  ]),
  invitedUsersController.addSubscribers
);
invites.delete(
  "/subscriber/:id",
  Auth,
  checkPermissions([
    { module: MODULE.SUBSCRIBERS, permission: PERMISSIONS.DELETE },
  ]),
  invitedUsersController.deleteSubscriber
);
invites.post(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.TEAM_MEMBERS, permission: PERMISSIONS.CREATE },
  ]),
  invitedUsersController.create
);
invites.get(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.TEAM_MEMBERS, permission: PERMISSIONS.READ },
  ]),
  invitedUsersController.show
);
invites.delete(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.TEAM_MEMBERS, permission: PERMISSIONS.DELETE },
  ]),
  invitedUsersController.delete
);
invites.post(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.TEAM_MEMBERS, permission: PERMISSIONS.UPDATE },
  ]),
  invitedUsersController.update
);
invites.get(
  "/subscriber",
  Auth,
  checkPermissions([
    { module: MODULE.SUBSCRIBERS, permission: PERMISSIONS.READ },
  ]),
  invitedUsersController.indexSubscriber
);

export default invites;
