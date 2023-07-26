import {Router} from "express";
// import multer from "multer";

import {UserLeadsController} from "../app/Controllers/userLeads.details.controller"
import { Auth } from "../app/Middlewares";

const userLeadsDetails: Router = Router();
userLeadsDetails.patch("/:id",Auth,UserLeadsController.updateLeadDetails);
userLeadsDetails.delete("/:id",Auth, UserLeadsController.delete);
userLeadsDetails.post("/",Auth,UserLeadsController.create);
userLeadsDetails.get("/",Auth, UserLeadsController.show);
userLeadsDetails.get("/:id", Auth,UserLeadsController.showById);

export default userLeadsDetails;