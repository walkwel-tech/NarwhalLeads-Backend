import { Router } from "express";

import { CardDetailsControllers } from "../app/Controllers/cardDetails.controller";
import { Auth } from "../app/Middlewares";


const cardDetails: Router = Router();
cardDetails.patch("/:id",Auth, CardDetailsControllers.updateCardDetails);
cardDetails.delete("/:id",Auth, CardDetailsControllers.delete);
cardDetails.patch("/toggleForCard/:id",Auth,CardDetailsControllers.toggleForCard)
cardDetails.post("/",CardDetailsControllers.create);
cardDetails.post("/addCredits",Auth,CardDetailsControllers.addCreditsManually);
cardDetails.post("/addCard",Auth,CardDetailsControllers.addCard);
cardDetails.get("/", CardDetailsControllers.show);
cardDetails.get("/:id", CardDetailsControllers.showById);
cardDetails.post("/create-session",CardDetailsControllers.createSessionRyft);
cardDetails.post("/attempt-payment",CardDetailsControllers.attemptPaymentRyft);
cardDetails.post("/payment-status",CardDetailsControllers.handlepaymentStatus);



export default cardDetails;