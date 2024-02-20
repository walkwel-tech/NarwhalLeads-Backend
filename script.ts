import mongoose, { Types } from "mongoose";
import { BuisnessIndustries } from "./src/app/Models/BuisnessIndustries";
import logger from "./src/utils/winstonLogger/logger";

require("dotenv").config();

const mongoURI = `${process.env.DB_URL}`;
const db = async () => {
  await mongoose.connect(mongoURI, {});
};

const updateUserPermission = async () => {
  try {
    await db();
    const business = await BuisnessIndustries.find({
      avgConversionRate: { $exists: false },
    });

    const result = await BuisnessIndustries.updateMany(
      { avgConversionRate: { $exists: false } },
      { $set: { avgConversionRate: 100 } },
      { new: true }
    );

    logger.info("updated successfully.", result, ">>>>>", business);
  } catch (error) {
    logger.error("Error updating permissions:", error);
  }
};
updateUserPermission();
