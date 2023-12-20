import { Router } from "express";

import { AuthController } from "../app/Controllers";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const auth: Router = Router();
auth.get("/map", AuthController.showMapFile);
auth.get("/map/ireland", AuthController.showMapFileForIreland);
auth.get("/code", AuthController.promoLink);
// auth.get('/mapForLabel',AuthController.showMapFileForLabel)
auth.get(
  "/",
  Auth,
  checkPermissions([{ module: MODULE.PROFILE, permission: PERMISSIONS.READ }]),
  AuthController.auth
);
auth.get(
  "/me",
  Auth,
  checkPermissions([{ module: MODULE.PROFILE, permission: PERMISSIONS.READ }]),
  AuthController.me
);
auth.post("/register", AuthController.register);
auth.post(
  "/activeUser/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.CLIENTS, permission: PERMISSIONS.UPDATE },
  ]),
  AuthController.activeUser
);
auth.post("/admin/register", AuthController.adminRegister);
auth.post("/login", AuthController.login);
auth.post("/adminLogin", AuthController.adminLogin);
auth.post("/checkUser", AuthController.checkUser);
auth.post("/forgetPassword", AuthController.forgetPassword);
auth.post("/changeClientPassword",OnlyAdmins, AuthController.updateClientPassword);

auth.get(
  "/user-status/:id",
  OnlyAdmins,
  checkPermissions([{ module: MODULE.CLIENTS, permission: PERMISSIONS.READ }]),
  AuthController.userStatus
);
auth.post("/createOnRyft", Auth, AuthController.createCustomerOnRyft);
auth.get("/impersonate/:id", Auth, AuthController.impersonate);

export default auth;
