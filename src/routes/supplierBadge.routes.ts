import {Router} from "express";
import {SupplierBadgeController} from "../app/Controllers/SupplierBadges";
import { Auth } from "../app/Middlewares";


const supplierBadgeRoutes: Router = Router();


supplierBadgeRoutes.get("/", Auth, SupplierBadgeController.getBadges);
supplierBadgeRoutes.get("/:type/:industrySlug", SupplierBadgeController.getBadge);
supplierBadgeRoutes.post("/check-badge", Auth, SupplierBadgeController.evaluateBadgeAdded);
supplierBadgeRoutes.post("/badges-credits", Auth, SupplierBadgeController.badgeCreditsList)
supplierBadgeRoutes.get("/my-badges", Auth, SupplierBadgeController.getMyBadge)


export default supplierBadgeRoutes;
