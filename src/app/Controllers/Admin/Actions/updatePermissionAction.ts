import { Request, Response } from "express";
import { Permissions } from "../../../Models/Permission";


export const updatePermissions = async (req: Request, res: Response) => {
    try {
      const input = req.body;
      const role = input.role;
      const permission = await Permissions.findOne({ role: role });
      if (permission) {
        const modulePermissions = permission.permissions?.find(
          (p: any) => p.module === module
        );
        if (modulePermissions) {
          permission.permissions.push(input.permission);
          await Permissions.findOneAndUpdate(
            { role: input.role },
            { permissions: permission.permissions }
          );
        } else {
          permission.permissions.push({
            module: input.module,
            permission: input.permission,
          });
          await Permissions.findOneAndUpdate(
            { role: input.role },
            { permissions: permission.permissions }
          );
        }
      }

      return res.json({ data: permission });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };