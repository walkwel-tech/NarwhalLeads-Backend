import mongoose from "mongoose";
import { ValidationConfig } from "../../app/Models/validationConfig";

require("dotenv").config();

const mongoURI = `${process.env.DB_URL}`;

const db = async () => {
  await mongoose.connect(mongoURI, {});
};

export const addValidationConfigRecord = async () => {
  try {
    await db();

    const newRecordValues = {
      key: "minimum_topUp_leadCount",
      value: 10,
      type: "min",
      enabled: true,
    };

    const newRecord = await ValidationConfig.create(newRecordValues);

    console.log("New record added:", newRecord);
  } catch (error) {
    console.error("Error adding new record:", error);
  } finally {
    mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
};
