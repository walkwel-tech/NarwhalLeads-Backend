import { Request, Response } from "express";
import { ServerResponse } from "http";
import { validate } from "class-validator";
import { RolesEnum } from "../../types/RolesEnum";
import { User } from "../Models/User";
import { PipelineStage, Types } from "mongoose";
import { commission } from "../../utils/Enums/commission.enum";
import { TimePeriod } from "../Inputs/TimePeriod.input";
import { QueryParams } from "../Inputs/QueryParams.input";
const LIMIT = 10;
const comissionPercentage = 0.5;

interface IQueryFormulater {
  accountManagerId: string[];
  industry: string[];
  timePeriod: TimePeriod;
  commissionStatus: string;
}

export class DashboardController {
  static getThirtyDayAgo(date: Date | string): Date {
    const inputDate = new Date(date);
    inputDate.setDate(inputDate.getDate() - 30);

    return inputDate;
  }

  static formulateComissionQuery({
    accountManagerId,
    industry,
    timePeriod,
    commissionStatus,
  }: IQueryFormulater): PipelineStage[] {
    const pipeline: PipelineStage[] = [
      { $match: { role: RolesEnum.ACCOUNT_MANAGER } },
      ...(accountManagerId?.length
        ? [
            {
              $match: {
                _id: {
                  $in: accountManagerId?.map(
                    (manager) => new Types.ObjectId(manager)
                  ),
                },
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "accountManager",
          as: "associatedUsers",
        },
      },
      {
        $unwind: {
          path: "$associatedUsers",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: { "associatedUsers.role": "user" } },
      ...(industry?.length
        ? [
            {
              $match: {
                "associatedUsers.businessIndustryId": {
                  $in: industry.map((industry) => new Types.ObjectId(industry)),
                },
              },
            },
          ]
        : []),
      ...(commissionStatus
        ? [
            {
              $match: {
                "associatedUsers.isCommissionedUser":
                  commissionStatus === commission.isComissioned ? true : false,
              },
            },
          ]
        : []),
      ...(timePeriod && Object.keys(timePeriod).length
        ? [
            {
              $lookup: {
                from: "transactions",
                localField: "associatedUsers._id",
                foreignField: "userId",
                as: "transactions",
              },
            },
            {
              $addFields: {
                activeClient: {
                  $sum: {
                    $cond: {
                      if: {
                        $gte: [
                          {
                            $size: {
                              $filter: {
                                input: "$transactions",
                                as: "transaction",
                                cond: {
                                  $and: [
                                    {
                                      $gte: [
                                        "$$transaction.createdAt",
                                        this.getThirtyDayAgo(
                                          timePeriod.startDate
                                        ),
                                      ],
                                    },
                                    {
                                      $lte: [
                                        "$$transaction.createdAt",
                                        new Date(timePeriod.endDate),
                                      ],
                                    },
                                    {
                                      $eq: ["$$transaction.status", "success"],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                          1,
                        ],
                      },
                      then: 1,
                      else: 0,
                    },
                  },
                },
              },
            },
            // {
            //   $match: {
            //     transactions: {
            //       $elemMatch: {
            //         createdAt: {
            //           $gte: this.getThirtyDayAgo(timePeriod.startDate),
            //           $lte: new Date(timePeriod.endDate),
            //         },
            //         status: { $eq: "success" }
            //       }
            //     }
            //   },
            // },
          ]
        : []),

      {
        $addFields: {
          fullName: {
            $concat: [
              "$firstName",
              " ",
              {
                $ifNull: [
                  "$lastName",
                  "", // Providing an empty string if lastName is null or missing
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          accountManager: { $first: "$$ROOT" },
          activeClient: { $sum: "$activeClient" },
          // clientsCount: { $sum: 1 },
          clientsCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    {
                      $gte: [
                        "$associatedUsers.createdAt",
                        new Date(timePeriod.startDate),
                      ],
                    },
                    {
                      $lte: [
                        "$associatedUsers.createdAt",
                        new Date(timePeriod.endDate),
                      ],
                    },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
          // activeClient: {
          //   $sum: {
          //     $cond: { if: "$associatedUsers.isActive", then: 1, else: 0 },
          //   },
          // },
          topUpSum: {
            $sum: "$associatedUsers.credits",
          },
          comission: {
            $sum: {
              $multiply: [
                "$associatedUsers.credits",
                comissionPercentage / 100,
              ],
            },
          },
        },
      },
      {
        $project: {
          "accountManager.password": 0,
          "accountManager.transactions": 0,
          "accountManager.associatedUsers": 0,
        },
      },
    ];
    return pipeline;
  }

  static formulateClientFinancialsQuery({
    accountManagerId,
    industry,
    timePeriod,
    commissionStatus,
  }: IQueryFormulater): PipelineStage[] {
    const pipeline: PipelineStage[] = [
      { $match: { role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] } } },
      ...(timePeriod && Object.keys(timePeriod).length
        ? [
            {
              $match: {
                createdAt: {
                  $gte: new Date(timePeriod.startDate),
                  $lte: new Date(timePeriod.endDate),
                },
              },
            },
          ]
        : []),
      ...(industry?.length
        ? [
            {
              $match: {
                businessIndustryId: {
                  $in: industry.map((industry) => new Types.ObjectId(industry)),
                },
              },
            },
          ]
        : []),
      ...(accountManagerId?.length
        ? [
            {
              $match: {
                accountManager: {
                  $in: accountManagerId?.map(
                    (manager) => new Types.ObjectId(manager)
                  ),
                },
              },
            },
          ]
        : []),
      ...(commissionStatus
        ? [
            {
              $match: {
                isCommissionedUser:
                  commissionStatus === commission.isComissioned ? true : false,
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: "users",
          localField: "accountManager",
          foreignField: "_id",
          as: "accountManagerArray",
        },
      },
      {
        $addFields: {
          "accountManagerArray.fullName": {
            $concat: [
              { $arrayElemAt: ["$accountManagerArray.firstName", 0] },
              " ",
              {
                $ifNull: [
                  { $arrayElemAt: ["$accountManagerArray.lastName", 0] },
                  " ", // Providing an empty string if lastName is null or missing
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          accountManager: {
            $cond: {
              if: { $isArray: "$accountManagerArray" },
              then: { $arrayElemAt: ["$accountManagerArray", 0] },
              else: "$accountManagerArray",
            },
          },
        },
      },
      {
        $lookup: {
          from: "leads",
          localField: "buyerId",
          foreignField: "bid",
          as: "associatedLeads",
        },
      },
      {
        $addFields: {
          leadsCount: { $size: "$associatedLeads" },
        },
      },
      {
        $project: {
          password: 0,
          accountManagerArray: 0,
        },
      },
    ];

    return pipeline;
  }

  static getComissions = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const queryParams = new QueryParams();
      queryParams.accountManagerId = req.body.accountManagerId as
        | string[]
        | undefined;
      queryParams.industry = req.body.industry as string[] | undefined;
      queryParams.timePeriod = req.body.timePeriod as TimePeriod | undefined;
      queryParams.commissionStatus = req.body.commissionStatus as
        | string
        | undefined;
      queryParams.page = req.body.page as number | undefined;
      queryParams.perPage = req.body.perPage as number | undefined;

      const validationErrors = await validate(queryParams);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: { message: "Invalid query parameters", validationErrors },
        });
      }

      const { perPage, page } = queryParams;

      let skip = 0,
        defaultPerPage = perPage ?? LIMIT;
      if (page) {
        skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
      }

      // const
      const pipeline: PipelineStage[] = this.formulateComissionQuery(
        queryParams as IQueryFormulater
      );

      const paginationPipeline: PipelineStage[] = [
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
            data: [{ $skip: skip }, { $limit: defaultPerPage }],
          },
        },
      ];

      const data = await User.aggregate([
        ...pipeline,
        ...(page ? paginationPipeline : []),
      ]);

      if (page) {
        return res.json({
          data: data[0]?.data,
          ...(data[0].metaData ? { meta: data[0].metaData[0] } : {}),
        });
      } else {
        return res.json({ data });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static comissionsExport = async (
    req: Request,
    res: Response | ServerResponse
  ) => {
    try {
      const queryParams = new QueryParams();
      queryParams.accountManagerId = req.body.accountManagerId as
        | string[]
        | undefined;
      queryParams.industry = req.body.industry as string[] | undefined;
      queryParams.timePeriod = req.body.timePeriod as TimePeriod | undefined;
      queryParams.commissionStatus = req.body.commissionStatus as
        | string
        | undefined;
      queryParams.page = req.body.page as number | undefined;
      queryParams.perPage = req.body.perPage as number | undefined;

      const validationErrors = await validate(queryParams);
      if (validationErrors.length > 0) {
        return (res as Response).status(400).json({
          error: { message: "Invalid query parameters", validationErrors },
        });
      }

      const pipeline: PipelineStage[] = this.formulateComissionQuery(
        queryParams as IQueryFormulater
      );

      const cleaninsingPipeline: PipelineStage[] = [
        {
          $project: {
            "Account Manager": "$accountManager.fullName",
            "Clients Number": "$clientsCount",
            "Number of active client": "$activeClient",
            "Topup total": "$topUpSum",
            Comission: "$comission",
            _id: 0,
          },
        },
      ];

      pipeline.push(...cleaninsingPipeline);

      const data = await User.aggregate(pipeline);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(JSON.stringify(data));
      res.end();
    } catch (err) {
      return (res as Response)
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }

    return;
  };

  static getClientFinancials = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const queryParams = new QueryParams();
      queryParams.accountManagerId = req.body.accountManagerId as
        | string[]
        | undefined;
      queryParams.industry = req.body.industry as string[] | undefined;
      queryParams.timePeriod = req.body.timePeriod as TimePeriod | undefined;
      queryParams.commissionStatus = req.body.commissionStatus as
        | string
        | undefined;
      queryParams.page = req.body.page as number | undefined;
      queryParams.perPage = req.body.perPage as number | undefined;

      const validationErrors = await validate(queryParams);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: { message: "Invalid query parameters", validationErrors },
        });
      }

      const { perPage, page } = queryParams;

      let skip = 0,
        defaultPerPage = perPage ?? LIMIT;
      if (page) {
        skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
      }

      const pipeline: PipelineStage[] = this.formulateClientFinancialsQuery(
        queryParams as IQueryFormulater
      );

      const paginationPipeline: PipelineStage[] = [
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
            data: [{ $skip: skip }, { $limit: defaultPerPage }],
          },
        },
      ];

      const data = await User.aggregate([
        ...pipeline,
        ...(page ? paginationPipeline : []),
      ]);

      if (page) {
        return res.json({
          data: data[0]?.data,
          ...(data[0].metaData ? { meta: data[0].metaData[0] } : {}),
        });
      } else {
        return res.json({ data });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static clientFinancialsExport = async (
    req: Request,
    res: Response | ServerResponse
  ) => {
    try {
      const queryParams = new QueryParams();
      queryParams.accountManagerId = req.body.accountManagerId as
        | string[]
        | undefined;
      queryParams.industry = req.body.industry as string[] | undefined;
      queryParams.timePeriod = req.body.timePeriod as TimePeriod | undefined;
      queryParams.commissionStatus = req.body.commissionStatus as
        | string
        | undefined;
      queryParams.page = req.body.page as number | undefined;
      queryParams.perPage = req.body.perPage as number | undefined;

      const validationErrors = await validate(queryParams);
      if (validationErrors.length > 0) {
        return (res as Response).status(400).json({
          error: { message: "Invalid query parameters", validationErrors },
        });
      }
      const pipeline: PipelineStage[] = this.formulateClientFinancialsQuery(
        queryParams as IQueryFormulater
      );

      const cleaninsingPipeline: PipelineStage[] = [
        {
          $project: {
            "Account Manager": "$accountManager.fullName",
            // "Account Manager": { $concat: ['$firstName', ' ', '$lastName'] },
            "Client Name": {
              $concat: [
                { $ifNull: ["$firstName", ""] },
                "",
                { $concat: [{ $ifNull: ["$lastName", ""] }] },
              ],
            },
            "Number of leads received": "$leadsCount",
            "Remaining Credits": "$credits",
            Status: {
              $cond: {
                if: { $eq: ["$isCommissionedUser", true] },
                then: true,
                else: { $ifNull: ["$isCommissionedUser", false] },
              },
            },
            _id: 0,
          },
        },
      ];

      pipeline.push(...cleaninsingPipeline);

      const data = await User.aggregate(pipeline);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(JSON.stringify(data));
      res.end();
    } catch (err) {
      return (res as Response)
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }

    return;
  };

  static getStats = async (req: Request, res: Response): Promise<Response> => {
    try {
      const queryParams = new QueryParams();
      queryParams.accountManagerId = req.body.accountManagerId as
        | string[]
        | undefined;
      queryParams.industry = req.body.industry as string[] | undefined;
      queryParams.timePeriod = req.body.timePeriod as TimePeriod | undefined;
      queryParams.commissionStatus = req.body.commissionStatus as
        | string
        | undefined;
      queryParams.page = req.body.page as number | undefined;
      queryParams.perPage = req.body.perPage as number | undefined;

      const validationErrors = await validate(queryParams);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: { message: "Invalid query parameters", validationErrors },
        });
      }

      const { accountManagerId, timePeriod, commissionStatus } = queryParams;
      const pipeline: PipelineStage[] = [
        // { $match: { role: RolesEnum.USER } },
        { $match: { role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] } } },

        ...(timePeriod && Object.keys(timePeriod).length
          ? [
              {
                $match: {
                  createdAt: {
                    $gte: new Date(timePeriod.startDate),
                    $lte: new Date(timePeriod.endDate),
                  },
                },
              },
            ]
          : []),
      ];

      if (accountManagerId?.length) {
        pipeline.push({
          $match: {
            accountManager: {
              $in: accountManagerId?.map(
                (manager) => new Types.ObjectId(manager)
              ),
            },
          },
        });
      }
      if (commissionStatus) {
        pipeline.push({
          $match: {
            isCommissionedUser:
              commissionStatus === commission.isComissioned ? true : false,
          },
        });
      }
      pipeline.push(
        {
          $lookup: {
            from: "leads",
            localField: "buyerId",
            foreignField: "bid",
            as: "associatedLeads",
          },
        },
        {
          $addFields: {
            leadsCount: { $size: "$associatedLeads" },
          },
        },
        {
          $group: {
            _id: null,
            comissionedClients: {
              $sum: {
                $cond: { if: "$isCommissionedUser", then: 1, else: 0 },
              },
            },
            nonComissionedClients: {
              $sum: {
                $cond: { if: "$isCommissionedUser", then: 0, else: 1 },
              },
            },
            totalLeads: {
              $sum: "$leadsCount",
            },
            remainingCredit: {
              $sum: "$credits",
            },
          },
        }
      );
      // if (commissionStatus) {
      //   pipeline.push({
      //     $match: {
      //       isCommissionedUser:
      //         commissionStatus === commission.isComissioned ? true : false,
      //     },
      //   });
      // }
      const data = await User.aggregate(pipeline);

      return res.json({ data: data[0] });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };
}
