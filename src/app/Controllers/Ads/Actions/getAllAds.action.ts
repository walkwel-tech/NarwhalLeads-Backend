import { Request, Response } from "express";
import { QueryParams } from "../../../Inputs/QueryParamsAd.input";
import { TimePeriod } from "../../../Inputs/TimePeriod.input";
import { validate } from "class-validator";
import { PipelineStage } from "mongoose";
import { Ad } from "../../../Models/Ad";
import { Types } from "mongoose";

const LIMIT = 10;

export const getAllAdsAction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const queryParams = new QueryParams();
    queryParams.industry = req.body.industry as string[] | undefined;
    queryParams.liveBtw = req.body.liveBtw as TimePeriod | undefined;
    queryParams.search = req.body.search;
    queryParams.active = req.body.active;
    queryParams.page = req.body.page;
    queryParams.perPage = req.body.perPage;

    const validationErrors = await validate(queryParams);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid query parameters", validationErrors },
      });
    }

    const { perPage, page, liveBtw, active, search, industry } = queryParams;

    let skip = 0,
      defaultPerPage = perPage ? perPage * 1 : LIMIT; // front end is not able to give perPage in number to me
    if (page) {
      skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
    }

    const pipeline: PipelineStage[] = [
      { $match: { isDeleted: false } },
      ...(liveBtw && Object.keys(liveBtw).length
        ? [
            {
              $match: {
                $or: [
                  {
                    $and: [
                      { startDate: { $gte: new Date(liveBtw.startDate) } },
                      { startDate: { $lte: new Date(liveBtw.endDate) } },
                    ],
                  },
                  {
                    $and: [
                      { endDate: { $gte: new Date(liveBtw.startDate) } },
                      { endDate: { $lte: new Date(liveBtw.endDate) } },
                    ],
                  },
                ],
              },
            },
          ]
        : []),
      ...(search
        ? [
            {
              $match: {
                title: {
                  $regex: search,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      ...(industry && industry.length
        ? [
            {
              $match: {
                industries: {
                  $in: industry.map(
                    (industryId) => new Types.ObjectId(industryId)
                  ),
                },
              },
            },
          ]
        : []),
      ...(active && active === "true"
        ? [
            {
              $match: {
                isActive: true,
              },
            },
          ]
        : active === "false"
        ? [
            {
              $match: {
                isActive: false,
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: "buisnessindustries",
          localField: "industries",
          foreignField: "_id",
          as: "joinedData",
        },
      },
      {
        $addFields: {
          industriesName: {
            $map: {
              input: "$joinedData",
              as: "data",
              in: "$$data.industry",
            },
          },
        },
      },
      {
        $project: {
          joinedData: 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      ...(page
        ? [
            {
              $facet: {
                metaData: [
                  { $count: "total" },
                  { $addFields: { page, perPage: defaultPerPage } },
                  {
                    $addFields: {
                      pageCount: {
                        $ceil: {
                          $divide: ["$total", defaultPerPage],
                        },
                      },
                    },
                  },
                ],
                data: [{ $skip: skip }, { $limit: defaultPerPage }],
              },
            },
          ]
        : []),
    ];

    const data = await Ad.aggregate(pipeline);

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
