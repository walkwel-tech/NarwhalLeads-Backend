import {Router} from "express";
import { LocationController } from "../app/Controllers/locationControllers";
const locationRoutes: Router = Router();

locationRoutes.get('/', LocationController.view)
locationRoutes.get('/all', LocationController.viewAll)

export default locationRoutes;