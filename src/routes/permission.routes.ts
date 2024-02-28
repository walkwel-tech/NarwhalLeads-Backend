import { Router } from "express";

import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";
import { PermissionController } from "../app/Controllers/permission.controller";
import { OnlyAdmins } from "../app/Middlewares";

const permissionRoutes: Router = Router();

permissionRoutes.get("/", OnlyAdmins, PermissionController.view);
permissionRoutes.post("/", OnlyAdmins, PermissionController.create);
permissionRoutes.get("/user/:id",
    OnlyAdmins,
    checkPermissions([
        { module: MODULE.ROLE_PERMISSIONS, permission: PERMISSIONS.READ },
    ]),
    PermissionController.getUserPermissions);
permissionRoutes.post("/user/:id", 
    OnlyAdmins, 
    checkPermissions([
        { module: MODULE.ROLE_PERMISSIONS, permission: PERMISSIONS.UPDATE },
    ]),
    PermissionController.updateUserPermissions);
permissionRoutes.delete("/:id", OnlyAdmins, PermissionController.delete);
permissionRoutes.post("/:id", OnlyAdmins, PermissionController.update);

export default permissionRoutes;
