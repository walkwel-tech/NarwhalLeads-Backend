import { Request, Response } from "express";
import { SupplierLink } from "../../../Models/SupplierLink";
import { SupplierBadgesStatus } from "../../../../utils/Enums/SupplierBadgesStatus";
import { GetClientBodyValidator } from "../../../Inputs/GetClients.input";
import { validate } from "class-validator";

const LIMIT = 10;

export const getBadgeAddedListAction = async (req: Request, res: Response) => {
  try {
    const bodyValidator = new GetClientBodyValidator();
    bodyValidator.page = req.body.page ? +req.body.page : 1;
    bodyValidator.perPage = req.body.perPage ? +req.body.perPage : 10;
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

    const badgesCreditList = await SupplierLink.aggregate([
      {
        $addFields: {
          status: {
            $cond: {
              if: {
                $and: [
                  { $eq: ["$lastSeen", null] },
                  { $eq: ["$firstSeen", null] },
                ],
              },
              then: SupplierBadgesStatus.NEVER_ADDED,
              else: {
                $cond: {
                  if: {
                    $eq: ["$lastSeen", "$lastChecked"],
                  },
                  then: SupplierBadgesStatus.ACTIVE,

                  else: {
                    $cond: {
                      if: {
                        $lt: ["$lastSeen", "$lastChecked"],
                      },
                      then: SupplierBadgesStatus.REMOVED,
                      else: SupplierBadgesStatus.NEVER_ADDED,
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from : "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user" 
      },
      {
        $addFields: {
          user: "$user" 
        }
      },
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
    ]);

    let data = {
      data: badgesCreditList[0]?.data ?? [],
      meta: badgesCreditList[0]?.metaData?.[0] ?? {},
    };

    return res.json(data);
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
