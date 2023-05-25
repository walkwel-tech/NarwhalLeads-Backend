import passport from "passport";

import { Request, Response, NextFunction } from "express";

import { UserInterface } from "../../types/UserInterface";
import { User } from "../Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { signUpFlowEnums } from "../../utils/Enums/signupFlow.enum";

export default function Auth(req: Request, res: Response, next: NextFunction) {
  return passport.authenticate(
    "jwt",
    { session: false },
    async (err, payload: UserInterface) => {
      const userCheck = await User.findById(payload.id);
      if (
        payload.role === RolesEnum.USER &&
        userCheck?.signUpFlowStatus == signUpFlowEnums.BUSINESS_DETAILS_LEFT
      ) {
        return res
          .status(401)
          .json({ error: { message: "business details not found." } });
      }
      if (
        payload.role === RolesEnum.USER &&
        userCheck?.signUpFlowStatus == signUpFlowEnums.LEADS_DETAILS_LEFT
      ) {
        return res
          .status(401)
          .json({ error: { message: "lead details not found." } });
      }
      if (
        payload.role === RolesEnum.USER &&
        userCheck?.signUpFlowStatus == signUpFlowEnums.CARD_DETAILS_LEFT
      ) {
        return res
          .status(401)
          .json({ error: { message: "card details not found." } });
      }
      if (err) {
        return res
          .status(500)
          .json({ error: { message: "Something went wrong" } });
      }
      if (!payload) {
        return res
          .status(401)
          .json({ error: { message: "Invalid Token. Access Denied!" } });
      }
      if (!payload.isActive) {
        return res.status(401).json({ error: { message: "User not Active!" } });
      }
      if (payload.isDeleted) {
        return res
          .status(401)
          .json({
            error: { message: "User is deleted.Please contact admin!" },
          });
      }
      if (!payload.isActive || !payload.isVerified) {
        return res
          .status(401)
          .json({
            error: {
              message:
                "User is not verified or not active.Please contact admin!",
            },
          });
      }
      req.user = (await User.findById(payload.id)) || undefined;
      return next();
    }
  )(req, res, next);
}
