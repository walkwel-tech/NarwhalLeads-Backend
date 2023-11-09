import { Router } from "express";
// import multer from "multer";

import { freeCreditsLinkController } from "../app/Controllers/freeCredits.Link.Controller";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const freeCreditsLinkRoutes: Router = Router();
freeCreditsLinkRoutes.delete(
  "/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.PROMO_LINKS, permission: PERMISSIONS.DELETE },
  ]),
  freeCreditsLinkController.delete
);
freeCreditsLinkRoutes.post(
  "/",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.PROMO_LINKS, permission: PERMISSIONS.CREATE },
  ]),
  freeCreditsLinkController.create
);
freeCreditsLinkRoutes.get(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.PROMO_LINKS, permission: PERMISSIONS.READ },
  ]),
  freeCreditsLinkController.show
);
freeCreditsLinkRoutes.post(
  "/:id",
  OnlyAdmins,
  checkPermissions([
    { module: MODULE.PROMO_LINKS, permission: PERMISSIONS.UPDATE },
  ]),
  freeCreditsLinkController.expire
);

freeCreditsLinkRoutes.get(
  "/stats",
  Auth,
  checkPermissions([
    { module: MODULE.PROMO_LINKS, permission: PERMISSIONS.READ },
  ]),
  OnlyAdmins,
  freeCreditsLinkController.stats
);
export default freeCreditsLinkRoutes;
