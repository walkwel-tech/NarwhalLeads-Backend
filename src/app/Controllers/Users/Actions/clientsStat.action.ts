import { Response } from "express";
import { Types } from "mongoose";
import { RolesEnum } from "../../../../types/RolesEnum";
import { RoleFilter } from "../Inputs/RoleFilter";
import { User } from "../../../Models/User";

export const clientsStatAction = async (_req: any, res: Response) => {
    try {
      let dataToFindActive: Record<
        string,
        string | Types.ObjectId | string[] | boolean | RoleFilter
      > = {
        role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
        isActive: true,
        isDeleted: false,
        isArchived: false,
      };
      let dataToFindPaused: Record<
        string,
        string | Types.ObjectId | string[] | boolean | RoleFilter
      > = {
        role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
        isActive: false,
        isDeleted: false,
        isArchived: false,
      };
      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        dataToFindActive.accountManager = _req.user._id;
        dataToFindPaused.accountManager = _req.user._id;
      }
      const active = await User.find(dataToFindActive).count();
      const paused = await User.find(dataToFindPaused).count();

      const dataToShow = {
        activeClients: active,
        pausedClients: paused,
      };
      return res.json({ data: dataToShow });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };