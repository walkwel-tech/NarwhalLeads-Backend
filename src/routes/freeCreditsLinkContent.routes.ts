import { Router } from "express";
import { OnlyAdmins } from "../app/Middlewares";
import { FreeCreditsLinkContentController } from "../app/Controllers/FreeCreditLinksContent";

const freeCreditsLinkContentRoutes: Router = Router();

freeCreditsLinkContentRoutes.post(
  "/",
  OnlyAdmins,
  FreeCreditsLinkContentController.create
);

freeCreditsLinkContentRoutes.get(
  "/:code",
  FreeCreditsLinkContentController.get
);

freeCreditsLinkContentRoutes.post(
  "/:id",
  OnlyAdmins,
  FreeCreditsLinkContentController.update
);

export default freeCreditsLinkContentRoutes;
