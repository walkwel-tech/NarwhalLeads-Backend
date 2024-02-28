import { Response} from "express"
import { RolesEnum } from "../../../../types/RolesEnum";
import { Types } from "mongoose";
import { User } from "../../../Models/User";
import { BusinessDetails } from "../../../Models/BusinessDetails";

export const showAction = async (req: any, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const business = req.query.business;

      const userMatch: Record<string, any> = {};

      if (req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        userMatch.accountManager = new Types.ObjectId(req.user._id);
      }
      const user = await User.findOne({ _id: req.params.id });
      const allowedRoles = [
        RolesEnum.ACCOUNT_ADMIN,
        RolesEnum.ACCOUNT_MANAGER,
        RolesEnum.ADMIN,
      ];

      if (user?.role && allowedRoles.includes(user.role)) {
        return res.json({ data: user });
      } else {
        const businessDetails = business
          ? await BusinessDetails.findById(id)
          : null;

        const users = business
          ? await User.findOne({ businessDetailsId: businessDetails?.id })
          : null;

        const matchId = business ? new Types.ObjectId(users?.id) : new Types.ObjectId(id);

        const query = await User.aggregate([
          {
            $match: {
              _id: matchId,
              ...userMatch,
            },
          },
          {
            $lookup: {
              from: "businessdetails",
              localField: "businessDetailsId",
              foreignField: "_id",
              as: "businessDetailsId",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "accountManager",
              foreignField: "_id",
              as: "accountManager",
            },
          },
          {
            $unwind: "$accountManager",
          },
          {
            $lookup: {
              from: "userleadsdetails",
              localField: "userLeadsDetailsId",
              foreignField: "_id",
              as: "userLeadsDetailsId",
            },
          },
          {
            $lookup: {
              from: "carddetails",
              localField: "_id",
              foreignField: "userId",
              as: "cardDetailsId",
            },
          },
        ]);

        if (query.length > 0) {
          const result = query[0];
          delete result.password;
          result.businessDetailsId = Object.assign(
            {},
            result.businessDetailsId[0]
          );
          result.cardDetailsId = Object.assign({}, result.cardDetailsId[0]);
          result.userLeadsDetailsId = Object.assign(
            {},
            result.userLeadsDetailsId[0]
          );
          result.accountManager = `${result?.accountManager?.firstName} ${
            result?.accountManager?.lastName || ""
          }`;

          return res.json({ data: result });
        } else {
          return res.json({ data: [] });
        }
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };