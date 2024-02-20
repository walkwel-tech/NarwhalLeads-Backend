import mongoose from "mongoose";
import { ValidationConfig } from "../../app/Models/validationConfig";
import logger from "../../utils/winstonLogger/logger"

require("dotenv").config();

const mongoURI = `${process.env.DB_URL}`;

const db = async () => {
  await mongoose.connect(mongoURI, {});
};

export const addValidationConfigRecord = async () => {
  try {
    await db();

    const existingRecord = await ValidationConfig.findOne({ key: "minimum_topUp_leadCount" });

    if (existingRecord) {
      logger.info("Record already exists:", existingRecord, new Date(), "Today's Date");
      return;
    }

    const newRecordValues = {
      key: "minimum_topUp_leadCount",
      value: 10,
      type: "min",
      enabled: true,
    };

    const newRecord = await ValidationConfig.create(newRecordValues);

    logger.info("New record added:", newRecord, new Date(), "Today's Date");
  } catch (error) {
    logger.error("Error adding new record:", error, new Date(), "Today's Date");
  } finally {
    mongoose.connection.close();
    logger.info("MongoDB connection closed", new Date(), "Today's Date");
  }
};
