import { Router } from "express";

import { LeadsController } from "../app/Controllers";
import { Auth } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

export const ipFilterError = (err: any, req: any, res: any, next: any) => {
  if (err) {
    return res.status(403).json({
      error: {
        message:
          "Access denied: Your IP address is not allowed to access this API",
      },
    });
  } else {
    next();
  }
};

const leads: Router = Router();

leads.get(
  "/generatepdf/:invoiceID",
  Auth,
  checkPermissions([
    { module: MODULE.INVOICES, permission: PERMISSIONS.CREATE },
  ]),
  LeadsController.generateInvoicePdf
);
leads.post("/leads-Preference", Auth, LeadsController.createPreference);
leads.post("/:buyerId", LeadsController.create);
leads.post(
  "/update/:id",
  Auth,
  checkPermissions([{ module: MODULE.LEADS, permission: PERMISSIONS.UPDATE }]),
  LeadsController.update
);
leads.get("/leads-Preference", Auth, LeadsController.showPreference);
leads.get(
  "/revenue",
  Auth,
  checkPermissions([
    { module: MODULE.DASHBOARD, permission: PERMISSIONS.READ },
  ]),
  LeadsController.revenue
);
leads.get(
  "/rightDashboardChart",
  Auth,
  checkPermissions([
    { module: MODULE.DASHBOARD, permission: PERMISSIONS.READ },
  ]),
  LeadsController.leadsCountDashboardChart
);
leads.get(
  "/leftDashboardChart",
  Auth,
  checkPermissions([
    { module: MODULE.DASHBOARD, permission: PERMISSIONS.READ },
  ]),
  LeadsController.totalLeadCostDashboardChart
);
leads.get(
  "/dashboardTopCards",
  Auth,
  checkPermissions([
    { module: MODULE.DASHBOARD, permission: PERMISSIONS.READ },
  ]),
  LeadsController.dashboardTopThreeCards
);
leads.patch("/re-order", Auth, LeadsController.reOrderIndex);
leads.post("/re-order", Auth, LeadsController.reOrderIndex);
leads.patch(
  "/:id",
  Auth,
  checkPermissions([{ module: MODULE.LEADS, permission: PERMISSIONS.UPDATE }]),
  LeadsController.update
);
leads.get(
  "/",
  Auth,
  checkPermissions([{ module: MODULE.LEADS, permission: PERMISSIONS.READ }]),
  LeadsController.index
),
  leads.get(
    "/reported-leads",
    Auth,
    checkPermissions([{ module: MODULE.LEADS, permission: PERMISSIONS.READ }]),
    LeadsController.showReportedLeads
  ),
  leads.get(
    "/stat",
    Auth,
    checkPermissions([
      { module: MODULE.DASHBOARD, permission: PERMISSIONS.READ },
    ]),
    LeadsController.leadsStat
  ),
  leads.get(
    "/export-csv-file-user-leads",
    Auth,
    checkPermissions([
      { module: MODULE.LEADS_CSV, permission: PERMISSIONS.READ },
    ]),
    LeadsController.exportCsvFileUserLeads
  ),
  leads.get(
    "/export-csv-file-admin-leads",
    Auth,
    checkPermissions([
      { module: MODULE.LEADS_CSV, permission: PERMISSIONS.READ },
    ]),
    LeadsController.exportCsvFileAdminLeads
  ),
  leads.get(
    "/allLeads/:id",
    Auth,
    checkPermissions([{ module: MODULE.LEADS, permission: PERMISSIONS.READ }]),
    LeadsController.showAllLeadsToAdminByUserId
  );
leads.get(
  "/allLeads",
  Auth,
  checkPermissions([{ module: MODULE.LEADS, permission: PERMISSIONS.READ }]),
  LeadsController.showAllLeadsToAdmin
);
leads.get(
  "/:id",
  Auth,
  checkPermissions([{ module: MODULE.LEADS, permission: PERMISSIONS.READ }]),
  LeadsController.leadById
);

export default leads;
