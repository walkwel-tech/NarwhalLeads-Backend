import * as cron from "node-cron";
import { updateSupplierBatch } from "./processBatch";
import logger from "../../../utils/winstonLogger/logger";
// import { updateReport } from ".";

export const checkSupplierWebsite = () => {
  let cronExpression = "0 * * * *";
  cron.schedule(cronExpression, async () => {
    try {
      await updateSupplierBatch(100);
    } catch (err) {
      logger.error("Client status update cron hits successfully", err);
    }
  });
};




