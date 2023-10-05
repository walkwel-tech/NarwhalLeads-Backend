import { Router } from "express";

import { GuestController } from "../app/Controllers/guest.controller";
import { OnlyAdmins } from "../app/Middlewares";

const guestRoutes: Router = Router();
guestRoutes.post(
  "/handle-Indutsry-Null-Values-In-Leads-Table",
  OnlyAdmins,
  GuestController.handleIndutsryNullValuesInLeadsTable
);
guestRoutes.get(
  "/assign-Randoms-AccountManager-To-Users",
  OnlyAdmins,
  GuestController.assignRandomsAccountManagersToUsers
);

guestRoutes.post(
  "/managePrefLeads",
  OnlyAdmins,
  GuestController.managePrefForLeads
);
guestRoutes.post(
  "/managePrefClients",
  OnlyAdmins,
  GuestController.managePrefForClients
);

guestRoutes.post(
  "/update-lead-preference",
  OnlyAdmins,
  GuestController.setLeadPreferenceAccordingToIndustryInDB
);
guestRoutes.post(
  "/set-business-industried-columns",
  OnlyAdmins,
  GuestController.runCommandToSetBusinessIndustryColumns
);
guestRoutes.post(
  "/set-lead-preference-columns",
  OnlyAdmins,
  GuestController.runCommandToSetLeadPreferenceColumns
);
guestRoutes.post(
  "/set-client-preference-columns",
  OnlyAdmins,
  GuestController.runCommandToSetClientTableColumns
);
guestRoutes.post(
  "/set-Business-Details",
  OnlyAdmins,
  GuestController.setBusinessDetails
);

export default guestRoutes;
