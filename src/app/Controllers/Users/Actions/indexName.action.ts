import {Request, Response} from "express"
import { UserInterface } from "../../../../types/UserInterface";
import { RolesEnum } from "../../../../types/RolesEnum";
import { Types } from "mongoose";
import { RoleFilter } from "../Inputs/RoleFilter";
import { User } from "../../../Models/User";

type FindOptions = {
    isDeleted: boolean;
    role: RoleFilter;
    accountManager?: Types.ObjectId;
  };

export const indexNameV2Action = async (req: Request, res: Response): Promise<Response> => {
    try {
      let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
      let dataToFind: FindOptions = {
        isDeleted: false,
        role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
      };
      if (user?.role === RolesEnum.ACCOUNT_MANAGER) {
        dataToFind.accountManager = new Types.ObjectId(user._id);
      }
      const business = await User.aggregate(
        [
          {
            $match: dataToFind,
          },
          {
            $lookup: {
              from: "businessdetails",
              localField: "businessDetailsId",
              foreignField: "_id",
              as: "businessInfo",
            },
          },
          {
            $unwind: "$businessInfo",
          },
          {
            $project: {
              "businessInfo._id": 1,
              "businessInfo.businessName": 1,
              _id: 0,
            },
          },
          { $sort: { "businessInfo.businessName": 1 } },
        ],
        {
          collation: {
            locale: "en", // Specify the locale for collation rules
          },
        }
      );
      if (business) {
        const reformattedObjects = business.map((item) => ({
          _id: item.businessInfo._id,
          businessName: item.businessInfo.businessName,
        }));
        return res.json({ data: reformattedObjects });
      } else {
        return res
          .status(404)
          .json({ error: { message: "Business not found." } });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };