import { Router } from 'express';

import { LeadsController } from '../app/Controllers';
import { Auth, OnlyAdmins } from '../app/Middlewares';

export const ipFilterError = (err:any, req:any, res:any, next:any) => {
    if (err) {
      return res
      .status(403)
      .json({ error: { message: 'Access denied: Your IP address is not allowed to access this API' } });
    } else {
      next()
    }
}

const leads: Router = Router();
leads.post("/managePref",LeadsController.managePref)

leads.get('/generatepdf/:invoiceID',Auth, LeadsController.generateInvoicePdf);
leads.post('/leads-Preference', Auth,LeadsController.createPreference);
leads.post('/:buyerId',LeadsController.create);
leads.post('/update/:id',Auth,LeadsController.update)
leads.get('/leads-Preference', Auth,LeadsController.showPreference);
leads.get('/revenue',Auth,LeadsController.revenue)
leads.get('/rightDashboardChart',Auth,LeadsController.leadsCountDashboardChart)
leads.get('/leftDashboardChart',Auth,LeadsController.totalLeadCostDashboardChart)
leads.get('/dashboardTopCards',Auth,LeadsController.dashboardTopThreeCards)
leads.patch('/re-order',Auth,LeadsController.reOrderIndex)
leads.post('/re-order',Auth,LeadsController.reOrderIndex)
leads.patch('/:id',Auth,LeadsController.update)
leads.get('/',Auth,LeadsController.index),
leads.get('/reported-leads',Auth,LeadsController.showReportedLeads),
leads.get('/export-csv-file-user-leads',Auth,LeadsController.export_csv_file_user_leads),
leads.get('/export-csv-file-admin-leads',OnlyAdmins,LeadsController.export_csv_file_admin_leads),
leads.get('/allLeads/:id',OnlyAdmins,LeadsController.showAllLeadsToAdminByUserId)
leads.get('/allLeads',OnlyAdmins,LeadsController.showAllLeadsToAdmin)
leads.get('/:id',Auth,LeadsController.leadById)








export default leads;