import { Request, Response } from "express";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import { Types } from "mongoose";
import { PostcodeAnalyticsValidator } from "../Inputs/postcodeAnalytics.input";
import { validate } from "class-validator";
import * as fs from "fs";
interface UserDetails {
  userId: Types.ObjectId;
  credits: number;
  industry: Types.ObjectId;
}
interface AggregationResult {
  data: {
    _id: {
      postalCode: string;
    };
    users: UserDetails[];
  }[];
  metaData: {
    total: number;
    page: number;
    perPage: number;
    pageCount: number;
  }[];
}
export class PostCodeAnalyticsController {
  static getActiveClientsByPostalCode = async (req: Request, res: Response) => {
    try {
      const paginationInput = new PostcodeAnalyticsValidator();
      paginationInput.perPage = req.body.perPage;
      paginationInput.page = req.body.page;
      paginationInput.industry = req.body.industry;
      paginationInput.search = (req.body.search as string) || "";

      const errors = await validate(paginationInput);

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const LIMIT = 10;
      const perPage = paginationInput.perPage || LIMIT;
      const page = paginationInput.page || 1;
      const skip = (page - 1) * perPage;

      const businessIndustryIds: string[] = paginationInput.industry || [];
      const search: string = paginationInput.search || "";

      const userLeadDetails: AggregationResult[] =
        await UserLeadsDetails.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userDetails",
            },
          },

          ...(businessIndustryIds.length > 0
            ? [
                {
                  $addFields: {
                    userDetail: {
                      $arrayElemAt: ["$userDetails", 0],
                    },
                  },
                },
                {
                  $match: {
                    "userDetail.businessIndustryId": {
                      $in: businessIndustryIds.map(
                        (id) => new Types.ObjectId(id)
                      ),
                    },
                  },
                },
              ]
            : []),
          {
            $unwind: "$postCodeTargettingList",
          },
          {
            $unwind: "$postCodeTargettingList.postalCode",
          },
          {
            $group: {
              _id: {
                postalCode: "$postCodeTargettingList.postalCode",
                userId: "$userId",
                businessIndustryId: "$userDetails.businessIndustryId",
              },
              credits: { $max: "$userDetails.credits" },
            },
          },
          {
            $group: {
              _id: "$_id.postalCode",
              userSet: {
                $addToSet: {
                  userId: "$_id.userId",
                  credits: "$credits",
                  businessIndustryId: "$_id.businessIndustryId",
                },
              },
            },
          },
          {
            $project: {
              postalCode: "$_id",
              users: "$userSet",
              _id: 0,
            },
          },
          {
            $match: {
              postalCode: { $exists: true },
              users: {
                $elemMatch: { userId: { $exists: true }, credits: { $gt: 0 } },
              },
              "users.userId": { $exists: true },
              ...(businessIndustryIds.length > 0
                ? {
                    "users.businessIndustryId": {
                      $in: businessIndustryIds.map(
                        (id) => new Types.ObjectId(id)
                      ),
                    },
                  }
                : {}),
            },
          },
          {
            $match: {
              postalCode: { $regex: search, $options: "i" },
            },
          },
          {
            $facet: {
              metaData: [
                { $count: "total" },
                { $addFields: { page, perPage: perPage } },
                {
                  $addFields: {
                    pageCount: {
                      $ceil: {
                        $divide: ["$total", perPage],
                      },
                    },
                  },
                },
              ],
              data: [{ $skip: skip }, { $limit: perPage }],
            },
          },
        ]);
      const data = userLeadDetails[0]?.data.map((entry: any) => ({
        postalCode: entry.postalCode,
        activeClients: entry.users
          .filter((user: { credits: number }) => user.credits > 0)
          ?.map((user: Partial<UserDetails>) => {
            return user?.userId;
          }),
        // inactiveClients: entry.users.filter(
        //   (user: { credits: number }) => user.credits <= 0
        // )?.map((user: Partial<UserDetails>) => {
        //   return user?.userId
        // }),
      }));
      return res.json({
        data,
        // userLeadDetails,
        meta: userLeadDetails[0]?.metaData[0],
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };
  static exportPostCodesCSVFile = async (req: Request, res: Response) => {
    try {
      const paginationInput = new PostcodeAnalyticsValidator();
      paginationInput.industry = req.body.industry;

      const errors = await validate(paginationInput);

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }
      const businessIndustryIds: string[] = paginationInput.industry || [];

      const userLeadDetails: AggregationResult[] =
        await UserLeadsDetails.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userDetails",
            },
          },

          ...(businessIndustryIds.length > 0
            ? [
                {
                  $addFields: {
                    userDetail: {
                      $arrayElemAt: ["$userDetails", 0],
                    },
                  },
                },
                {
                  $match: {
                    "userDetail.businessIndustryId": {
                      $in: businessIndustryIds.map(
                        (id) => new Types.ObjectId(id)
                      ),
                    },
                  },
                },
              ]
            : []),
          {
            $unwind: "$postCodeTargettingList",
          },
          {
            $unwind: "$postCodeTargettingList.postalCode",
          },
          {
            $group: {
              _id: {
                postalCode: "$postCodeTargettingList.postalCode",
                userId: "$userId",
                businessIndustryId: "$userDetails.businessIndustryId",
              },
              credits: { $max: "$userDetails.credits" },
            },
          },
          {
            $group: {
              _id: "$_id.postalCode",
              userSet: {
                $addToSet: {
                  userId: "$_id.userId",
                  credits: "$credits",
                  businessIndustryId: "$_id.businessIndustryId",
                },
              },
            },
          },
          {
            $project: {
              postalCode: "$_id",
              users: "$userSet",
              _id: 0,
            },
          },
          {
            $match: {
              postalCode: { $exists: true },
              users: {
                $elemMatch: { userId: { $exists: true }, credits: { $gt: 0 } },
              },
              "users.userId": { $exists: true },
              ...(businessIndustryIds.length > 0
                ? {
                    "users.businessIndustryId": {
                      $in: businessIndustryIds.map(
                        (id) => new Types.ObjectId(id)
                      ),
                    },
                  }
                : {}),
            },
          },
        ]);

      const jsonData = userLeadDetails.map((entry: any) => ({
        postalCode: entry.postalCode,
        activeClients: entry.users.filter(
          (user: { credits: number }) => user.credits > 0
        ).length,
        inactiveClients: entry.users.filter(
          (user: { credits: number }) => user.credits <= 0
        ).length,
      }));

      const jsonFilePath = "postal_dash_export.json";

      fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));

      return res.download(jsonFilePath);
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };
}
