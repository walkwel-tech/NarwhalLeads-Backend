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
      logger.info("Record already exists:", { existingRecord });
      return;
    }

    const newRecordValues = {
      key: "minimum_topUp_leadCount",
      value: 10,
      type: "min",
      enabled: true,
    };

    const newRecord = await ValidationConfig.create(newRecordValues);

    logger.info("New record added:", { newRecord });
  } catch (error) {
    logger.error("Error adding new record:", error);
  } finally {
    mongoose.connection.close();
    ("MongoDB connection closed");
  }
};
