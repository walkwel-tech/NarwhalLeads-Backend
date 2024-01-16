import { Router } from "express";

import { PostCodeAnalyticsController } from "../app/Controllers/postCodeAnalytics.controller";

const postCodeAnalyticsRoutes: Router = Router();

postCodeAnalyticsRoutes.post(
  "/",
  PostCodeAnalyticsController.getActiveClientsByPostalCode
);
postCodeAnalyticsRoutes.post(
  "/export-csv-file",
  PostCodeAnalyticsController.exportPostCodesCSVFile
);
export default postCodeAnalyticsRoutes;
