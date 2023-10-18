import { Router } from "express";

import { CardDetailsControllers } from "../app/Controllers/cardDetails.controller";
import { Auth } from "../app/Middlewares";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const cardDetails: Router = Router();
cardDetails.post(
  "/payment-status",
  CardDetailsControllers.handlepaymentStatusWebhook
);

cardDetails.post(
  "/stripe-payment-status",
  CardDetailsControllers.handlepaymentStatusWebhookStripe
);

cardDetails.post(
  "/create-session",
  CardDetailsControllers.createInitialSession
);

cardDetails.post(
  "/addCredits",
  Auth,
  checkPermissions([
    { module: MODULE.PROFILE, permission: PERMISSIONS.UPDATE },
  ]),
  CardDetailsControllers.addCreditsManually
);
cardDetails.post(
  "/addCard",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.CREATE },
  ]),
  CardDetailsControllers.addCard
);
cardDetails.get("/strip-return-url", CardDetailsControllers.stripeReturnURL);
cardDetails.post("/session-new", CardDetailsControllers.ryftPaymentSession);
cardDetails.get("/session", CardDetailsControllers.retrievePaymentSssion);
cardDetails.post(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.UPDATE },
  ]),
  CardDetailsControllers.updateCardDetails
);
cardDetails.patch(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.UPDATE },
  ]),
  CardDetailsControllers.updateCardDetails
);
cardDetails.delete(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.DELETE },
  ]),
  CardDetailsControllers.delete
);
cardDetails.post(
  "/toggleForCard/:id",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.UPDATE },
  ]),
  CardDetailsControllers.toggleForCard
);
cardDetails.patch(
  "/toggleForCard/:id",
  Auth,
  CardDetailsControllers.toggleForCard
);
cardDetails.post(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.CREATE },
  ]),
  CardDetailsControllers.create
);
cardDetails.get(
  "/",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.READ },
  ]),
  CardDetailsControllers.show
);
cardDetails.get(
  "/:id",
  Auth,
  checkPermissions([
    { module: MODULE.CARD_DETAILS, permission: PERMISSIONS.READ },
  ]),
  CardDetailsControllers.showById
);

export default cardDetails;
