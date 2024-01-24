import * as cron from "node-cron";
import { updateReport } from ".";

export const updateReportStatus = () => {
  let cronExpression = "0 * * * *";
  cron.schedule(cronExpression, async () => {
    try{
        await updateReport(100)
    } catch (err){
        console.error("Client status update cron hits successfully", new Date())
    }
  });
};
