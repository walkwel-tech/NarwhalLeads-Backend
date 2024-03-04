import { Request, Response } from "express";

import { validate } from "class-validator";
import { commonPaginationPipeline } from "./commonPagination";
import { GetUsersQuery } from "../Inputs/GetUsersOuery";
import { User } from "../../../Models/User";
import { RolesEnum } from "../../../../types/RolesEnum";

const LIMIT = 10;

export const getUsersActions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { search, createdBtw } = req.query;

    const queryValidator = new GetUsersQuery();
    queryValidator.page = req.query.page ? +req.query.page : 1;
    queryValidator.perPage = req.query.perPage ? +req.query.perPage : LIMIT;
    queryValidator.search = search as string;
    queryValidator.startTime = createdBtw
      ? (createdBtw as string)?.split(",")[0]
      : ("" as string);
    queryValidator.endTime = createdBtw
      ? (createdBtw as string)?.split(",")[1]
      : ("" as string);
    queryValidator.buyerId = req.query.buyerId as string;
    queryValidator.isDeleted = Boolean(req.query.isDeleted);

    const validationErrors = await validate(queryValidator);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid query parameters", validationErrors },
      });
    }

    const { page, perPage, isDeleted, startTime, endTime } = queryValidator;

    let skip = 0,
      defaultPerPage = perPage ? perPage : LIMIT;
    if (page) {
      skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
    }

    const users = await User.aggregate([
      {
        $match: {
          role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
          ...(isDeleted
            ? {
                isDeleted,
              }
            : {}),
          ...(search
            ? {
                $or: [
                  { email: { $regex: search, $options: "i" } },
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { buyerId: { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: { $concat: ["$firstName", " ", "$lastName"] },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              }
            : {}),
          ...(createdBtw
            ? {
                $and: [
                  { createdAt: { $gte: new Date(startTime) } },
                  { createdAt: { $lte: new Date(endTime) } },
                ],
              }
            : {}),
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          autoCharge: 1,
          leadCost: 1,
          credits: 1,
          signUpFlowStatus: 1,
          autoChargeAmount: 1,
          businessIndustryId: 1,
          invitedById: 1,
          paymentMethod: 1,
          createdAt: 1,
          updatedAt: 1,
          buyerId: 1,
          isAutoChargeEnabled: 1,
          country: 1,
          currency: 1,
          isCreditsAndBillingEnabled: 1,
          isCommissionedUser: 1,
          secondaryCredits: 1,
          secondaryLeadCost: 1,
          clientStatus: 1
        }
      },
      ...commonPaginationPipeline(page, perPage, defaultPerPage, skip),
      
    ]);
    let data = {
      data: users[0]?.data ?? [],
      meta: users[0]?.metaData?.[0] ?? {},
    };
    res.json(data);
  } catch (err) {
    return res.status(500).json({
      error: { messsage: "Something went wrong", err },
    });
  }
};
