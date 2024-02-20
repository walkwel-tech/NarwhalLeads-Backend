import * as cron from "node-cron"
const { exec } = require("child_process");
import logger from "../../utils/winstonLogger/logger";

export const db_dump = () => {
    cron.schedule("0 0 * * *", async () => {


  // Replace these values with your MongoDB connection information
  const host = process.env.DB_HOST; // MongoDB host
  const port = process.env.DB_PORT; // MongoDB port
  const databaseName = process.env.DB_NAME; // Database name
  const outputPath = process.env.DB_OUTPUT_PATH; // Directory where the backup will be stored

  // Create the command to run mongodump
  const command = `${process.env.DB_MONGO_DUMP_PATH} --host ${host} --port ${port} --db ${databaseName} --out ${outputPath}`;

  // Execute the command
  exec(command, (error: any, stdout: any, stderr: any) => {
    if (error) {
      logger.error("Error:", error, new Date(), "Today's Date");
    } else {
      logger.info("Backup completed successfully", new Date(), "Today's Date");
    }
  });
})
};
