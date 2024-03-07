import { Router } from "express";
import { Auth } from "../app/Middlewares";
import { DataSyncController } from "../app/Controllers/DataSync";
import CheckAccessKey from "../app/Middlewares/checkAccessKey";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const dataSyncRoutes: Router = Router();

dataSyncRoutes.get("/industries", CheckAccessKey, DataSyncController.getIndustries);
dataSyncRoutes.get("/users", CheckAccessKey, DataSyncController.getUsers);
dataSyncRoutes.get("/transactions", CheckAccessKey, DataSyncController.getTransactions);
dataSyncRoutes.get("/leads", CheckAccessKey, DataSyncController.getLeads);
dataSyncRoutes.post("/token", Auth, checkPermissions([{ module: MODULE.SYSTEM_SYNC, permission: PERMISSIONS.READ }]), DataSyncController.createToken);

export default dataSyncRoutes;
