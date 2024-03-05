import { Request, Response } from "express";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import {
  GetBusinessIndustriesQuery,
  IndustryStatus,
} from "../Inputs/GetBusinessIndusriesQuery";
import { validate } from "class-validator";
import { commonPaginationPipeline } from "./commonPagination";

const LIMIT = 10;

export const getBusinessIndustriesActions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { search, status } = req.query;

    const queryValidator = new GetBusinessIndustriesQuery();
    queryValidator.page = req.query.page ? +req.query.page : 1;
    queryValidator.perPage = req.query.perPage ? +req.query.perPage : LIMIT;
    queryValidator.search = search as string;
    queryValidator.status = status as string;
    queryValidator.isDeleted = Boolean(req.query.isDeleted);

    const validationErrors = await validate(queryValidator);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid query parameters", validationErrors },
      });
    }

    const { page, perPage, isDeleted } = queryValidator;
    let skip = 0,
      defaultPerPage = perPage ? perPage : LIMIT;
    if (page) {
      skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
    }

    const industries = await BuisnessIndustries.aggregate([
      {
        $match: {
          ...(status
            ? {
                isActive: status === IndustryStatus.ACTIVE ? true : false,
              }
            : {}),
          ...(isDeleted
            ? {
                isDeleted,
              }
            : {}),
          ...(search ? { industry: { $regex: search, $options: "i" } } : {}),
        },
      },
      ...commonPaginationPipeline(page, perPage, defaultPerPage, skip),
    ]);
    let data = {
      data: industries[0]?.data ?? [],
      meta: industries[0]?.metaData?.[0] ?? {},
    };
    res.json(data);
  } catch (err) {
    return res.status(500).json({
      error: { messsage: "Something went wrong", err },
    });
  }
};
