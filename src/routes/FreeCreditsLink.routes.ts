import {Router} from "express";
// import multer from "multer";

import {freeCreditsLinkController} from "../app/Controllers/freeCredits.Link.Controller";
import {  OnlyAdmins } from "../app/Middlewares";

const freeCreditsLinkRoutes: Router = Router();
freeCreditsLinkRoutes.delete("/:id",OnlyAdmins, freeCreditsLinkController.delete);
freeCreditsLinkRoutes.post("/",OnlyAdmins, freeCreditsLinkController.create);
freeCreditsLinkRoutes.get("/",OnlyAdmins, freeCreditsLinkController.show);
freeCreditsLinkRoutes.post("/:id",OnlyAdmins, freeCreditsLinkController.expire);






export default freeCreditsLinkRoutes;