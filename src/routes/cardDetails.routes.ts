import { Router } from "express";

import { CardDetailsControllers } from "../app/Controllers/cardDetails.controller";
import { Auth } from "../app/Middlewares";


const cardDetails: Router = Router();
cardDetails.post("/payment-status",CardDetailsControllers.handlepaymentStatusWebhook);
cardDetails.post("/create-session",CardDetailsControllers.createInitialSessionRyft);
cardDetails.post("/addCredits",Auth,CardDetailsControllers.addCreditsManually);
cardDetails.post("/addCard",Auth,CardDetailsControllers.addCard);
cardDetails.post("/session-new", CardDetailsControllers.ryftPaymentSession);
cardDetails.get("/session", CardDetailsControllers.retrievePaymentSssion);
cardDetails.post("/:id",Auth, CardDetailsControllers.updateCardDetails);
cardDetails.patch("/:id",Auth, CardDetailsControllers.updateCardDetails);
cardDetails.delete("/:id",Auth, CardDetailsControllers.delete);
cardDetails.post("/toggleForCard/:id",Auth,CardDetailsControllers.toggleForCard)
cardDetails.patch("/toggleForCard/:id",Auth,CardDetailsControllers.toggleForCard)
cardDetails.post("/",CardDetailsControllers.create);
cardDetails.get("/", CardDetailsControllers.show);
cardDetails.get("/:id", CardDetailsControllers.showById);




export default cardDetails;