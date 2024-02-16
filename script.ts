import mongoose, { Types } from "mongoose";

import { BuisnessIndustries } from "./src/app/Models/BuisnessIndustries";

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

    console.log("updated successfully.", result, ">>>>>", business);
  } catch (error) {
    console.error("Error updating permissions:", error);
  }
};
updateUserPermission();
