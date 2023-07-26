import { Router } from "express";

import { CardDetailsControllers } from "../app/Controllers/cardDetails.controller";
import { Auth } from "../app/Middlewares";


const cardDetails: Router = Router();
cardDetails.post("/session-new", CardDetailsControllers.ryftPaymentSession);
cardDetails.get("/session", CardDetailsControllers.retrievePaymentSssion);
cardDetails.patch("/:id",Auth, CardDetailsControllers.updateCardDetails);
cardDetails.delete("/:id",Auth, CardDetailsControllers.delete);
cardDetails.patch("/toggleForCard/:id",Auth,CardDetailsControllers.toggleForCard)
cardDetails.post("/",CardDetailsControllers.create);
cardDetails.post("/addCredits",Auth,CardDetailsControllers.addCreditsManually);
cardDetails.post("/addCard",Auth,CardDetailsControllers.addCard);
cardDetails.get("/", CardDetailsControllers.show);
cardDetails.get("/:id", CardDetailsControllers.showById);
cardDetails.post("/create-session",CardDetailsControllers.createInitialSessionRyft);
cardDetails.post("/payment-status",CardDetailsControllers.handlepaymentStatusWebhook);




export default cardDetails;