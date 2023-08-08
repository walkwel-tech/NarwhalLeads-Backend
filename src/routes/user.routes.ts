import {Router} from "express";
import multer from "multer";

import {UsersControllers} from "../app/Controllers/";
import { Auth, OnlyAdminOrUserLogin, OnlyAdmins } from "../app/Middlewares";
import { storeFile } from "../app/Middlewares/fileUpload";

import { FileEnum } from "../types/FileEnum";

const user: Router = Router();
let maxSize = 5*1000*1000;
//@ts-ignore
const fileSizeLimitErrorHandler = (err, req, res, next) => {
    if (err) {
      return res
      .status(400)
      .json({ error: { message: "upload file less than 5mb" } });
    } else {
      next()
    }
}
const upload = multer({ storage: storeFile(`${process.cwd()}${FileEnum.PUBLICDIR}${FileEnum.PROFILEIMAGE}`) ,limits:{fileSize:maxSize}})
user.post("/:id",OnlyAdminOrUserLogin,upload.single('image'),fileSizeLimitErrorHandler, UsersControllers.update);
user.get("/invoices",Auth, UsersControllers.invoices);
user.get("/show",OnlyAdmins, UsersControllers.indexName);
user.post("/",OnlyAdmins,upload.single('image'),fileSizeLimitErrorHandler,UsersControllers.create);
user.get("/",OnlyAdmins, UsersControllers.index);
user.get("/export-csv-file",OnlyAdmins, UsersControllers.showAllClientsForAdminExportFile);
user.patch("/reorder",OnlyAdmins, UsersControllers.reOrderIndex);
user.post("/reorder",OnlyAdmins, UsersControllers.reOrderIndex);
user.get("/:id",OnlyAdminOrUserLogin, UsersControllers.show);
user.patch("/:id",OnlyAdminOrUserLogin,upload.single('image'),fileSizeLimitErrorHandler, UsersControllers.update);
user.post("/:id",OnlyAdminOrUserLogin,upload.single('image'),fileSizeLimitErrorHandler, UsersControllers.update);
user.delete("/:id",OnlyAdmins, UsersControllers.destroy);


export default user;
