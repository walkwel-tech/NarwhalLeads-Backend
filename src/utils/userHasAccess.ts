import {Permissions} from "../app/Models/Permission";
import {PermissionInterface} from "../types/PermissionsInterface";
import {UserInterface} from "../types/UserInterface";

export async function userHasAccess(
    user: Partial<UserInterface> | undefined,
    requiredPermissions: { module: string; permission: string }[]
): Promise<boolean> {

    if (!user) {
        return false;
    }

    const userPermissions =
        (await Permissions.findOne({role: user.role})) ??
        ({} as PermissionInterface);

    if (userPermissions) {
        for (const {module, permission} of requiredPermissions) {
            const modulePermissions = userPermissions.permissions?.find(
                (p: Record<string, string[] | string>) => p.module === module
            );
            if (
                !modulePermissions ||
                !modulePermissions.permission.includes(permission)
            ) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}
