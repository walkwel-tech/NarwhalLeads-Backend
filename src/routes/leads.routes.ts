import { Router } from 'express';

import { LeadsController } from '../app/Controllers';
import { Auth, OnlyAdmins } from '../app/Middlewares';

const leads: Router = Router();
leads.get('/generatepdf/:invoiceID',Auth, LeadsController.generateInvoicePdf);
leads.post('/leads-Preference', Auth,LeadsController.createPreference);
leads.get('/leads-Preference', Auth,LeadsController.showPreference);
leads.get('/revenue',Auth,LeadsController.revenue)
leads.get('/rightDashboardChart',Auth,LeadsController.leadsCountDashboardChart)
leads.get('/leftDashboardChart',Auth,LeadsController.totalLeadCostDashboardChart)
leads.get('/dashboardTopCards',Auth,LeadsController.dashboardTopThreeCards)
leads.patch('/re-order',Auth,LeadsController.reOrderIndex)
leads.patch('/:id',Auth,LeadsController.update)
leads.get('/',Auth,LeadsController.show),
leads.get('/reported-leads',Auth,LeadsController.showReportedLeads),
leads.get('/showMyLeads',Auth,LeadsController.showMyLeads),
leads.get('/showAllLeadsForAdmin',OnlyAdmins,LeadsController.showAllLeadsForAdmin),
leads.get('/allLeads/:id',OnlyAdmins,LeadsController.showAllLeadsToAdminByUserId)
leads.get('/allLeads',OnlyAdmins,LeadsController.showAllLeadsToAdmin)
leads.get('/:id',Auth,LeadsController.leadById)
leads.post('/:id', LeadsController.create);







export default leads;