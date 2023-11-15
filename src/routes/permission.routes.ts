import { Router } from "express";

import { PermissionController } from "../app/Controllers/permission.controller";
import { OnlyAdmins } from "../app/Middlewares";

const permissionRoutes: Router = Router();

permissionRoutes.get("/", OnlyAdmins, PermissionController.view);
permissionRoutes.post("/", OnlyAdmins, PermissionController.create);
permissionRoutes.delete("/:id", OnlyAdmins, PermissionController.delete);
permissionRoutes.post("/:id", OnlyAdmins, PermissionController.update);

export default permissionRoutes;
