import {NextFunction, Request, Response} from "express";
import {userHasAccess} from "../../utils/userHasAccess";

export const checkPermissions = (
    requiredPermissions: { module: string; permission: string }[]
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        console.log(req.user)
        const canAccess = await userHasAccess(req.user, requiredPermissions);

        if (canAccess) {
            next();
        } else {
            res.status(403).json({message: "You do not have permission to access this resource"});
        }
    };
};
