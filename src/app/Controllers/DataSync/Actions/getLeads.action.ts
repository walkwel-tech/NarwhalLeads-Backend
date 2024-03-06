import { Request, Response } from "express";
import { validate } from "class-validator";
import { commonPaginationPipeline } from "./commonPagination";
import { GetLeadsQuery } from "../Inputs/GetLeadsQuery";
import { Leads } from "../../../Models/Leads";
import { leadsStatusEnums } from "../../../../utils/Enums/leads.status.enum";

const LIMIT = 10;

export const getLeadsActions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { timePeriod } = req.query;

    const queryValidator = new GetLeadsQuery();
    queryValidator.page = req.query.page ? +req.query.page : 1;
    queryValidator.perPage = req.query.perPage ? +req.query.perPage : LIMIT;
    queryValidator.status = req.query.status
      ? (req.query.status as string).toUpperCase()
      : "";
    queryValidator.startTime = timePeriod
      ? (timePeriod as string)?.split(",")[0]
      : ("" as string);
    queryValidator.endTime = timePeriod
      ? (timePeriod as string)?.split(",")[1]
      : ("" as string);
    const validationErrors = await validate(queryValidator);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid query parameters", validationErrors },
      });
    }

    const { page, perPage, status, startTime, endTime } = queryValidator;
    let skip = 0,
      defaultPerPage = perPage ? perPage : LIMIT;
    if (page) {
      skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
    }

    const transacations = await Leads.aggregate([
      {
        $match: {
          ...(status
            ? {
                status: (leadsStatusEnums as any)[status],
              }
            : {}),

          ...(timePeriod
            ? {
                $and: [
                  { createdAt: { $gte: new Date(startTime) } },
                  { createdAt: { $lte: new Date(endTime) } },
                ],
              }
            : {}),
        },
      },
      ...commonPaginationPipeline(page, perPage, defaultPerPage, skip),
    ]);
    let data = {
      data: transacations[0]?.data ?? [],
      meta: transacations[0]?.metaData?.[0] ?? {},
    };
    res.json(data);
  } catch (err) {
    return res.status(500).json({
      error: { messsage: "Something went wrong", err },
    });
  }
};