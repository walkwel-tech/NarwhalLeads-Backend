import { Router } from "express";

import { PostCodeAnalyticsController } from "../app/Controllers/postCodeAnalytics.controller";

const postCodeAnalyticsRoutes: Router = Router();

postCodeAnalyticsRoutes.post(
  "/",
  PostCodeAnalyticsController.getActiveClientsByPostalCode
);

export default postCodeAnalyticsRoutes;
