import mongoose from "mongoose";
import { UserSchema } from "../schemas/UserSchema";
import { PermissionSchema } from "../schemas/permissionsSchema";

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

    console.log("Permissions updated successfully.");
  } catch (error) {
    console.error("Error updating permissions:", error);
  } finally {
    mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
};

