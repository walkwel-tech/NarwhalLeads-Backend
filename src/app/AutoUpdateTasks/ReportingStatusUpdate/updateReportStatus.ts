import * as cron from "node-cron";
import { updateReport } from ".";
import logger from "../../../utils/winstonLogger/logger";

export const updateReportStatus = () => {
  let cronExpression = "0 * * * *";
  cron.schedule(cronExpression, async () => {
    try{
        await updateReport(100)
    } catch (err){
        logger.error("Client status update cron hits successfully", new Date(), "Today's Date")
    }
  });
};
