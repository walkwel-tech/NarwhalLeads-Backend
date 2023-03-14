import {Router} from "express";
// import multer from "multer";

import {freeCreditsLinkController} from "../app/Controllers/freeCredits.Link.Controller";
import {  OnlyAdmins } from "../app/Middlewares";

const freeCreditsLinkRoutes: Router = Router();
freeCreditsLinkRoutes.post("/",OnlyAdmins, freeCreditsLinkController.create);
freeCreditsLinkRoutes.get("/",OnlyAdmins, freeCreditsLinkController.show);
freeCreditsLinkRoutes.delete("/:id",OnlyAdmins, freeCreditsLinkController.delete);





export default freeCreditsLinkRoutes;