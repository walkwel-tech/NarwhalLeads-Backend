import { Router } from "express";
import { DashboardController } from "../app/Controllers/dashboard.controller";

const dashboardRoutes: Router = Router();

dashboardRoutes.post("/commissions", DashboardController.getComissions);
dashboardRoutes.post(
  "/client-financials",
  DashboardController.getClientFinancials
);
dashboardRoutes.post("/stats", DashboardController.getStats);
dashboardRoutes.post(
  "/commissions/export",
  DashboardController.comissionsExport
);
dashboardRoutes.post(
  "/client-financials/export",
  DashboardController.clientFinancialsExport
);

export default dashboardRoutes;
