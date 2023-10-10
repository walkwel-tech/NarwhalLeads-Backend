import { Router } from "express";

import { UserServiceController } from "../app/Controllers/userService.controller";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const userService: Router = Router();

userService.post(
  "/",
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.CREATE },
  ]),
  UserServiceController.create
);

export default userService;
