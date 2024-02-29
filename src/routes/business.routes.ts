import { Router } from "express";
import multer from "multer";

import { Auth } from "../app/Middlewares";
import { storeFile } from "../app/Middlewares/fileUpload";

import { FileEnum } from "../types/FileEnum";
import { fileMaxSize } from "../utils/constantFiles/fileMaxSize";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";
import { BusinessDetailsController } from "../app/Controllers/Business";
// import path from "path";
// const fs=require("fs")
//@ts-ignore
export const fileSizeLimitErrorHandler = (err, req, res, next) => {
  if (err) {
    return res
      .status(400)
      .json({ error: { message: "upload file less than 5mb" } });
  } else {
    next();
  }
};
const businessDetails: Router = Router();

const upload = multer({
  storage: storeFile(
    `${process.cwd()}${FileEnum.PUBLICDIR}${FileEnum.PROFILEIMAGE}`
  ),
  limits: { fileSize: fileMaxSize.FILE_MAX_SIZE },
});
businessDetails.post(
  "/non-billables-users",
  upload.single("businessLogo"),
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.CREATE },
  ]),
  fileSizeLimitErrorHandler,
  BusinessDetailsController.nonBillableBusiness
);
businessDetails.post(
  "/:id",
  upload.single("businessLogo"),
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.UPDATE },
  ]),
  fileSizeLimitErrorHandler,
  BusinessDetailsController.updateBusiness
);
businessDetails.patch(
  "/:id",
  upload.single("businessLogo"),
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.UPDATE },
  ]),
  fileSizeLimitErrorHandler,
  BusinessDetailsController.updateBusiness
);
businessDetails.delete(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.DELETE },
  ]),
  BusinessDetailsController.deleteBusiness
);
businessDetails.post(
  "/",
  Auth,
  upload.single("businessLogo"),
  fileSizeLimitErrorHandler,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.CREATE },
  ]),
  BusinessDetailsController.createBusiness
);
businessDetails.get(
  "/",
  Auth,
  checkPermissions([{ module: MODULE.PROFILE, permission: PERMISSIONS.READ }]),
  BusinessDetailsController.getBusiness
);
businessDetails.get(
  "/:id",
  Auth,
  checkPermissions([{ module: MODULE.PROFILE, permission: PERMISSIONS.READ }]),
  BusinessDetailsController.getBusinessById
);

export default businessDetails;
