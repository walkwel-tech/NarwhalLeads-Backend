import { Request, Response } from "express";
import { UserInterface } from "../../../../types/UserInterface";
import { GetClientBodyValidator } from "../../../Inputs/GetClients.input";
import { sort } from "../../../../utils/Enums/sorting.enum";
import { RolesEnum } from "../../../../types/RolesEnum";
import { validate } from "class-validator";
import { PipelineStage } from "mongoose";
import { getClientsQuery } from "./getClientsQuery.action";
import { IGetClientsQuery } from "../Inputs/IGetClientsQuery";
import { ClientTablePreferenceInterface } from "../../../../types/clientTablePrefrenceInterface";
import { ClientTablePreference } from "../../../Models/ClientTablePrefrence";
import { User } from "../../../Models/User";
import { DataObject } from "../Inputs/DataObject";
import { filterAndTransformData } from "./filterAndTransformData";
import { convertArray } from "./convertArray";
import logger from "../../../../utils/winstonLogger/logger";

export const showAllClientsForAdminExportFileV2Action = async (
    req: Request,
    res: Response
  ): Promise<any> => {
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

      bodyValidator.sortingOrder = sortingOrder
        ? (sortingOrder as string)
        : sort.DESC;
      bodyValidator.accountManagerId =
        user.role === RolesEnum.ACCOUNT_MANAGER
          ? user.id
          : (accountManagerId as string);
      bodyValidator.onBoardingPercentage = onBoardingPercentage as string;
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
      const pipeline: PipelineStage[] = getClientsQuery(
        bodyValidator as IGetClientsQuery
      );

      const formatPipeline: PipelineStage[] = [
        // { $skip: 10 },
        //       { $limit: 10 },
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
      ];

      const result = await User.aggregate([...pipeline, ...formatPipeline]);

      const pref: ClientTablePreferenceInterface | null =
        await ClientTablePreference.findOne({
          userId: (req.user as UserInterface).id,
        });

      const filteredDataArray: DataObject[] = filterAndTransformData(
        //@ts-ignore
        pref?.columns ?? clientTablePreference,
        convertArray(result)
      );
      const arr = filteredDataArray;
      return res.json({
        data: arr,
      });
    } catch (err) {
      logger.error(
        "Error while showing all clients for admin export file",
        err
      );
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };