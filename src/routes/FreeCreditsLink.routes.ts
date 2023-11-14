import { Router } from "express";
// import multer from "multer";

import { freeCreditsLinkController } from "../app/Controllers/freeCredits.Link.Controller";
import { Auth } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const freeCreditsLinkRoutes: Router = Router();
freeCreditsLinkRoutes.delete(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.PROMO_LINKS, permission: PERMISSIONS.DELETE },
  ]),
  freeCreditsLinkController.delete
);
freeCreditsLinkRoutes.post(
  "/",
  Auth,
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
  Auth,
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
  freeCreditsLinkController.stats
);
export default freeCreditsLinkRoutes;
