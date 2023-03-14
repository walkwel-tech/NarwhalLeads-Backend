import {Router} from "express";

import {AdminSettingsController} from "../app/Controllers/admin.controller";
import { Auth, OnlyAdmins } from "../app/Middlewares";
const adminSettings: Router = Router();

adminSettings.post("/",OnlyAdmins,AdminSettingsController.create);
adminSettings.patch("/",OnlyAdmins,AdminSettingsController.update);
adminSettings.get("/",OnlyAdmins,AdminSettingsController.show);
adminSettings.get("/clientColumnsPreference",OnlyAdmins,AdminSettingsController.showClientTablePreference);
adminSettings.post("/clientColumnsPreference",OnlyAdmins,AdminSettingsController.createPreference);
adminSettings.get("/FAQs",Auth,AdminSettingsController.showFaqs);
adminSettings.patch("/FAQs",OnlyAdmins,AdminSettingsController.createFaqs);
adminSettings.delete("/",OnlyAdmins,AdminSettingsController.delete);




export default adminSettings;