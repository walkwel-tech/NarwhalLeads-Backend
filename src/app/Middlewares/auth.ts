import passport from "passport";

import { Request, Response, NextFunction } from "express";

import { UserInterface } from "../../types/UserInterface";
import { User } from "../Models/User";

export default function Auth(req: Request, res: Response, next: NextFunction) {
  return passport.authenticate(
    "jwt",
    { session: false },
    async (err: any, payload: UserInterface) => {
      if (err) {
        return res
          .status(500)
          .json({ error: { message: "Something went wrong" } });
      }
      const tokenUser: any = await User.findById(payload.id);
      if (!payload || !tokenUser) {
        return res
          .status(401)
          .json({ error: { message: "Invalid Token. Access Denied!" } });
      }
      if (!tokenUser?.isActive) {
        return res.status(409).json({ error: { message: "User not Active!" } });
      }
      if (tokenUser?.isDeleted) {
        return res.status(401).json({
          error: { message: "User is deleted.Please contact admin!" },
        });
      }
      req.user = tokenUser || undefined;
      return next();
    }
  )(req, res, next);
}
