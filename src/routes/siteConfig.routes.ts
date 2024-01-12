import { Router } from "express";
import { OnlyAdmins } from "../app/Middlewares";

import { SiteConfigController } from "../app/Controllers/SiteConfig.controller";

const siteconfigRoutes: Router = Router();

siteconfigRoutes.post('/', OnlyAdmins, SiteConfigController.create);

export default siteconfigRoutes;