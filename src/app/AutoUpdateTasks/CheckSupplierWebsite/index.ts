import * as cron from "node-cron";
import { updateSupplierBatch } from "./processBatch";
// import { updateReport } from ".";

export const checkSupplierWebsite = () => {
  let cronExpression = "0 * * * *";
  cron.schedule(cronExpression, async () => {
    try {
      await updateSupplierBatch(100);
    } catch (err) {
      console.error("Client status update cron hits successfully", new Date());
    }
  });
};




