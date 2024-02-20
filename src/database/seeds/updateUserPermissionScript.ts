import mongoose from "mongoose";
import { UserSchema } from "../schemas/UserSchema";
import { PermissionSchema } from "../schemas/permissionsSchema";
import logger from "../../utils/winstonLogger/logger"

require("dotenv").config();

const mongoURI = `${process.env.DB_URL}`;

const db = async () => {
  await mongoose.connect(mongoURI, {});
};


export const updatePermissionsForUsers = async () => {
  try {
    await db();

    const UserModel = mongoose.model("User", UserSchema);
    const PermissionModel = mongoose.model("Permission", PermissionSchema);

    const permissions = await PermissionModel.find().lean();

    const updateOperations = permissions.map(permission => {
      const { role, permissions: rolePermissions } = permission;
      return UserModel.updateMany({ role }, { permissions: rolePermissions }).exec();
    });

    await Promise.all(updateOperations);

    logger.info("Permissions updated successfully.", new Date(), "Today's Date");
  } catch (error) {
    logger.error("Error updating permissions:", error, new Date(), "Today's Date");
  } finally {
    mongoose.connection.close();
    logger.info("MongoDB connection closed", new Date(), "Today's Date");
  }
};

