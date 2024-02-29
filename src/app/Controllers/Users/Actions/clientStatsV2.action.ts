import { Response } from "express";
import { UserInterface } from "../../../../types/UserInterface";
import { User } from "../../../Models/User";
import { PipelineStage, Types } from "mongoose";
import { RolesEnum } from "../../../../types/RolesEnum";
import { userStatus } from "../../../Inputs/GetClients.input";

export const clientsStatsV2Action = async (_req: any, res: Response) => {
    try {
      const user = _req.user as UserInterface;
      const stats: PipelineStage[] = await User.aggregate([
        {
          $match: {
            ...(user.role === RolesEnum.ACCOUNT_MANAGER ? {accountManager: new Types.ObjectId(user.id)} : {}),
            role: {
              $nin: [
                RolesEnum.ADMIN,
                RolesEnum.INVITED,
                RolesEnum.SUPER_ADMIN,
                RolesEnum.SUBSCRIBER,
              ],
            },
            // isDeleted: false,
            isActive: true,
          },
        },
        {
          $group: {
            _id: null,
            activeClients: {
              $sum: {
                $cond: {
                  if: { $eq: ["$clientStatus", userStatus.ACTIVE] },
                  then: 1,
                  else: 0,
                },
              },
            },
            pausedClients: {
              $sum: {
                $cond: {
                  if: { $eq: ["$clientStatus", userStatus.INACTIVE] },
                  then: 1,
                  else: 0,
                },
              },
            },
            pendingClients: {
              $sum: {
                $cond: {
                  if: { $eq: ["$clientStatus", userStatus.PENDING] },
                  then: 1,
                  else: 0,
                },
              },
            },
            lostClients: {
              $sum: {
                $cond: {
                  if: { $eq: ["$clientStatus", userStatus.LOST] },
                  then: 1,
                  else: 0,
                },
              },
            },
          },
        },
      ]);
      return res.json({ data: stats[0] });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };