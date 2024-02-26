import { Router } from "express";

import { RolesController } from "../app/Controllers/roles.controller";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const rolesRoutes: Router = Router();

rolesRoutes.get("/",
    checkPermissions([
        { module: MODULE.ROLE_PERMISSIONS, permission: PERMISSIONS.READ },
    ]),
    RolesController.getAllRolesAndPermissions
);
rolesRoutes.post("/",
    checkPermissions([
        { module: MODULE.ROLE_PERMISSIONS, permission: PERMISSIONS.CREATE },
    ]),
    RolesController.createRole
);
rolesRoutes.get("/:id",
    checkPermissions([
        { module: MODULE.ROLE_PERMISSIONS, permission: PERMISSIONS.READ },
    ]),
    RolesController.getRoleAndPermissions
);
rolesRoutes.post("/:id",
    checkPermissions([
        { module: MODULE.ROLE_PERMISSIONS, permission: PERMISSIONS.UPDATE },
    ]),
    RolesController.updateRolePermissions
);

export default rolesRoutes;
