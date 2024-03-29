import { Router } from "express";
import multer from "multer";

// import { UsersControllers } from "../app/Controllers/";
import { UsersControllersV2 as UsersControllers } from "../app/Controllers/Users";
import { Auth, OnlyAdminOrUserLogin, OnlyAdmins } from "../app/Middlewares";
import { storeFile } from "../app/Middlewares/fileUpload";

import { FileEnum } from "../types/FileEnum";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const user: Router = Router();
let maxSize = 5 * 1000 * 1000;
//@ts-ignore
const fileSizeLimitErrorHandler = (err, req, res, next) => {
  if (err) {
    return res
      .status(400)
      .json({ error: { message: "upload file less than 5mb" } });
  } else {
    next();
  }
};
const upload = multer({
  storage: storeFile(
    `${process.cwd()}${FileEnum.PUBLICDIR}${FileEnum.PROFILEIMAGE}`
  ),
  limits: { fileSize: maxSize },
});

user.get(
  "/v2",
  Auth,
  checkPermissions([{ module: MODULE.CLIENTS, permission: PERMISSIONS.READ }]),
  UsersControllers.indexV2
);


user.post("/autoCharge/:id", Auth, UsersControllers.autoChargeNow);

user.post(
  "/account-manager/stats",
  checkPermissions([
    { module: MODULE.DASHBOARD, permission: PERMISSIONS.READ },
  ]),
  UsersControllers.accountManagerStats
);

user.post(
  "/update-email/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.CLIENTS, permission: PERMISSIONS.UPDATE },
  ]),
  UsersControllers.updateEmail
);

user.post(
  "/process-report",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.CLIENTS, permission: PERMISSIONS.UPDATE },
  ]),
  UsersControllers.updateClientsStatus
);

user.post(
  "/manual-adjustment",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.CLIENTS, permission: PERMISSIONS.UPDATE },
  ]),
  UsersControllers.userCreditsManualAdjustment
);

user.post(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.UPDATE },
  ]),
  upload.single("image"),
  fileSizeLimitErrorHandler,
  UsersControllers.update
);

user.get(
  "/invoices",
  Auth,
  checkPermissions([{ module: MODULE.INVOICES, permission: PERMISSIONS.READ }]),
  UsersControllers.invoices
);
user.get(
  "/show",
  Auth,
  checkPermissions([{ module: MODULE.CLIENTS, permission: PERMISSIONS.READ }]),
  UsersControllers.indexName
);
user.post(
  "/",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.CLIENTS, permission: PERMISSIONS.CREATE },
  ]),
  upload.single("image"),
  fileSizeLimitErrorHandler,
  UsersControllers.create
);
user.get(
  "/",
  Auth,
  checkPermissions([{ module: MODULE.CLIENTS, permission: PERMISSIONS.READ }]),
  UsersControllers.index
);

user.get(
  "/stats",
  Auth,
  checkPermissions([{ module: MODULE.CLIENTS, permission: PERMISSIONS.READ }]),
  UsersControllers.clientsStatsV2
);

user.get(
  "/export-csv-file",
  Auth,
  checkPermissions([
    { module: MODULE.CLIENTS_CSV, permission: PERMISSIONS.READ },
  ]),
  UsersControllers.showAllClientsForAdminExportFileV2
);
user.patch("/reorder", OnlyAdmins, UsersControllers.reOrderIndex);
user.post("/reorder", OnlyAdmins, UsersControllers.reOrderIndex);
user.get(
  "/:id",
  Auth,
  checkPermissions([{ module: MODULE.PROFILE, permission: PERMISSIONS.READ }]),
  UsersControllers.show
);
user.patch(
  "/:id",
  OnlyAdminOrUserLogin,
  checkPermissions([
    { module: MODULE.CLIENTS, permission: PERMISSIONS.UPDATE },
  ]),
  upload.single("image"),
  fileSizeLimitErrorHandler,
  UsersControllers.update
);
user.delete(
  "/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.CLIENTS, permission: PERMISSIONS.DELETE },
  ]),
  UsersControllers.destroy
);

user.post("/test-lead/:id", Auth, UsersControllers.sendTestLeadData);

export default user;
