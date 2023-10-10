import { NextFunction, Request, Response } from "express";
import { UserInterface } from "../../types/UserInterface";
import { Permissions } from "../Models/Permission";
import { PermissionInterface } from "../../types/PermissionsInterface";

export const checkPermissions = (
  requiredPermissions: { module: string; permission: string }[]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
    const userRole = user.role;
    //   const userPermissions:any = permissions.find((p:any) => p.role === userRole);
    const userPermissions =
      (await Permissions.findOne({ role: userRole })) ??
      ({} as PermissionInterface);
    if (userPermissions) {
      for (const { module, permission } of requiredPermissions) {
        const modulePermissions = userPermissions.permissions?.find(
          (p: Record<string, string[] | string>) => p.module === module
        );
        if (
          !modulePermissions ||
          !modulePermissions.permission.includes(permission)
        ) {
          return res.status(403).json({
            error: {
              message: `Access denied !! You do not have permission to ${permission} in the ${module} module.`,
            },
          });
        }
      }
      next();
      return;
    } else {
      return res.status(403).json({
        error: `Access denied !!.`,
      });
    }
  };
};
