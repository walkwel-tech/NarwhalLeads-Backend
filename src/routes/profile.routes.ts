import { Router } from "express";

import { ProfileController } from "../app/Controllers/";

import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const profile: Router = Router();

profile.post(
  "/change-password",
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.UPDATE },
  ]),
  ProfileController.changePassword
);

export default profile;
