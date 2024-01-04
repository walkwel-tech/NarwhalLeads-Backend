import mongoose from "mongoose";
import { Permissions } from "./src/app/Models/Permission";
import { User } from "./src/app/Models/User";
require('dotenv').config();


const mongoURI = `${process.env.DB_URL}`;
const db = async () => {
    await mongoose.connect(mongoURI, {
    });
  };

  const permissionScript = async () => {
    try {
        await db();
      const users = await User.find();
  
      for (const user of users) {
        const permissions = await Permissions.findOne({ role: user.role });
  
        if (permissions) {
          user.permissions = permissions.permissions;
          await user.save();
        }
      }
  
      console.log('Permissions updated successfully.');
  
      
    } catch (error) {
      console.error('Error updating permissions:', error);
      
    }
  };
  permissionScript();