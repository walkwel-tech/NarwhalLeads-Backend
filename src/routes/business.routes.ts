import { Router} from "express";
import multer from "multer";

import {BusinessDetailsController} from "../app/Controllers/business.details.controller";
import { Auth } from "../app/Middlewares";
import { storeFile } from "../app/Middlewares/fileUpload";

import { FileEnum } from "../types/FileEnum";
import { fileMaxSize } from "../utils/constantFiles/fileMaxSize";
// import path from "path";
// const fs=require("fs")
//@ts-ignore
export const fileSizeLimitErrorHandler = (err, req, res, next) => { 
  // const profileImageDir = path.join(__dirname, "..",FileEnum.PROFILEIMAGE);
    
  // if (!fs.existsSync(profileImageDir)) {
  //   fs.mkdirSync(profileImageDir, { recursive: true });
  // }
    if (err) {
      return res
      .status(400)
      .json({ error: { message: "upload file less than 5mb" } });
    } else {
      next()
    }
}
const businessDetails: Router = Router();
const upload = multer({ storage: storeFile(`${process.cwd()}${FileEnum.PUBLICDIR}${FileEnum.PROFILEIMAGE}`),  limits: { fileSize: fileMaxSize.FILE_MAX_SIZE }},)
businessDetails.post("/:id",upload.single('businessLogo'), Auth,fileSizeLimitErrorHandler,BusinessDetailsController.updateBusinessDetails);
businessDetails.patch("/:id",upload.single('businessLogo'), Auth,fileSizeLimitErrorHandler,BusinessDetailsController.updateBusinessDetails);
businessDetails.delete("/:id",Auth, BusinessDetailsController.delete);
businessDetails.post("/",Auth,upload.single('businessLogo'),fileSizeLimitErrorHandler,BusinessDetailsController.create);
businessDetails.get("/", Auth,BusinessDetailsController.show);
businessDetails.get("/:id", Auth,BusinessDetailsController.showById);

export default businessDetails;