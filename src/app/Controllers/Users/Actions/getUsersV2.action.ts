import {Request, Response} from "express"
import { UserInterface } from "../../../../types/UserInterface";
import { GetClientBodyValidator } from "../../../Inputs/GetClients.input";
import { sort } from "../../../../utils/Enums/sorting.enum";
import { RolesEnum } from "../../../../types/RolesEnum";
import { validate } from "class-validator";
import { getClientsQuery } from "./getClientsQuery.action";
import { PipelineStage } from "mongoose";
import { IGetClientsQuery } from "../Inputs/IGetClientsQuery";
import { User } from "../../../Models/User";

const LIMIT = 10;

export const getUsersV2Actions = async (req: Request, res: Response): Promise<any> => {
    try {
      const user = req.user as UserInterface
      const {
        onBoardingPercentage,
        sortingOrder,
        accountManagerId,
        businessDetailId,
        industryId,
        clientStatus,
        search,
        clientType,
      } = req.query;

      const bodyValidator = new GetClientBodyValidator();
      bodyValidator.page = req.query.page ? +req.query.page : 1;
      bodyValidator.perPage = req.query.perPage ? +req.query.perPage : 10;
      bodyValidator.sortingOrder = sortingOrder
        ? (sortingOrder as string)
        : sort.DESC;
      bodyValidator.onBoardingPercentage = onBoardingPercentage as string;
      bodyValidator.accountManagerId =
        user.role === RolesEnum.ACCOUNT_MANAGER
          ? user.id
          : (accountManagerId as string);
      bodyValidator.businessDetailId = businessDetailId as string;
      bodyValidator.industryId = industryId as string;
      bodyValidator.search = search as string;
      bodyValidator.clientStatus = clientStatus as string;
      bodyValidator.clientType = clientType as string;
      const validationErrors = await validate(bodyValidator);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: { message: "Invalid query parameters", validationErrors },
        });
      }

      const { page, perPage } = bodyValidator;
      let skip = 0,
        defaultPerPage = perPage ? perPage * 1 : LIMIT;
      if (page) {
        skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
      }

      const pipeline: PipelineStage[] = getClientsQuery(
        bodyValidator as IGetClientsQuery
      );

      const formatPipeline: PipelineStage[] = [
        {
          $facet: {
            metaData: [
              { $count: "total" },
              { $addFields: { page, perPage: defaultPerPage } },
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
            data: [
              { $skip: skip },
              { $limit: defaultPerPage },
              {
                $lookup: {
                  from: "userleadsdetails",
                  localField: "userLeadsDetailsId",
                  foreignField: "_id",
                  as: "userLeadsDetail",
                },
              },
              {
                $lookup: {
                  from: "businessdetails", // Target collection
                  localField: "businessDetailsId",
                  foreignField: "_id",
                  as: "businessDetail",
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "accountManager",
                  foreignField: "_id",
                  as: "account",
                },
              },
              {
                $lookup: {
                  from: "userservices",
                  localField: "userServiceId",
                  foreignField: "_id",
                  as: "userService",
                },
              },
              {
                $addFields: {
                  businessDetailsId: {
                    $ifNull: [{ $arrayElemAt: ["$businessDetail", 0] }, {}],
                  },
                  userLeadsDetailsId: {
                    $ifNull: [{ $arrayElemAt: ["$userLeadsDetail", 0] }, {}],
                  },
                  userServiceId: {
                    $ifNull: [{ $arrayElemAt: ["$userService", 0] }, {}],
                  },
                  // accountManager:{ $arrayElemAt: ['$account.firstName', 0] },
                  accountManager: {
                    $ifNull: [{ $arrayElemAt: ["$account.firstName", 0] }, ""],
                  },
                },
              },

              {
                $project: {
                  password: 0,
                  businessDetail: 0,
                  userService: 0,
                  account: 0,
                  userLeadsDetail: 0,
                  // businessDetailsId: "$businessDetailsId",
                  // userLeadsDetailsId: "$userLeadsDetailsId",
                  // accountManager: "$accountManager",
                  userTransactions: 0,
                },
              },
            ],
          },
        },
      ];

      const result = await User.aggregate([...pipeline, ...formatPipeline]);

      let data = {
        data: result[0]?.data ?? [],
        meta: result[0]?.metaData?.[0] ?? {},
      };
      res.json(data);
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };