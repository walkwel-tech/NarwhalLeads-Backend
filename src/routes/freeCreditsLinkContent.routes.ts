import { Router } from "express";
import { Auth, OnlyAdmins } from "../app/Middlewares";
import { FreeCreditsLinkContentController } from "../app/Controllers/FreeCreditLinksContent";

const freeCreditsLinkContentRoutes: Router = Router();

freeCreditsLinkContentRoutes.post(
  "/",
  OnlyAdmins,
  FreeCreditsLinkContentController.create
);

freeCreditsLinkContentRoutes.get(
  "/:code",
  Auth,
  FreeCreditsLinkContentController.get
);

export default freeCreditsLinkContentRoutes;
