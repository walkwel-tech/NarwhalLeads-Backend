import { Router} from "express";
import {IndustryController} from "../app/Controllers/industry.controller";
import {OnlyAdmins } from "../app/Middlewares";
const industry: Router = Router();
industry.patch("/:id",OnlyAdmins,IndustryController.update);
industry.post("/",OnlyAdmins,IndustryController.create);
industry.get("/",OnlyAdmins,IndustryController.view);
industry.get("/industry",IndustryController.showIndustries);
industry.delete("/:id",OnlyAdmins,IndustryController.delete);
industry.get("/:id",OnlyAdmins,IndustryController.viewbyId);
industry.patch("/renameColumns/:id",OnlyAdmins,IndustryController.renameCustomColumns);
industry.get("/renameColumns/:id",OnlyAdmins,IndustryController.showCustomColumnsName);


export default industry;