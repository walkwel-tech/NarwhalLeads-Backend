import { Router } from "express";

import { TransactionController } from "../app/Controllers";
import { checkPermissions } from "../app/Middlewares/roleBasedAuthentication";
import { MODULE, PERMISSIONS } from "../utils/Enums/permissions.enum";

const transactions: Router = Router();

transactions.get(
  "/",
  checkPermissions([
    { module: MODULE.TRANSACTIONS, permission: PERMISSIONS.READ },
  ]),
  TransactionController.show
);

export default transactions;
