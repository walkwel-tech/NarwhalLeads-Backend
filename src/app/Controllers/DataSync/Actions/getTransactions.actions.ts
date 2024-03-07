import { Request, Response } from "express";
import { validate } from "class-validator";
import { commonPaginationPipeline } from "./commonPagination";
import { GetTransactionQuery } from "../Inputs/GetTransactionsQuery";
import { Transaction } from "../../../Models/Transaction";
import { transactionTitle } from "../../../../utils/Enums/transaction.title.enum";
import { PAYMENT_STATUS } from "../../../../utils/Enums/payment.status";

const LIMIT = 10;

export const getTransactionActions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { timePeriod } = req.query;

    const queryValidator = new GetTransactionQuery();
    queryValidator.page = req.query.page ? +req.query.page : 1;
    queryValidator.perPage = req.query.perPage ? +req.query.perPage : LIMIT;
    queryValidator.status = req.query.status
      ? (req.query.status as string).toUpperCase()
      : "";
    queryValidator.type = req.query.type
      ? (req.query.type as string).toUpperCase()
      : ("" as string);
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

    const { page, perPage, status, type, startTime, endTime } = queryValidator;
    let skip = 0,
      defaultPerPage = perPage ? perPage : LIMIT;
    if (page) {
      skip = (page > 0 ? page - 1 : 0) * defaultPerPage;
    }

    const transacations = await Transaction.aggregate([
      {
        $match: {
          title: {
            $nin: [
              transactionTitle.INVOICES_VAT,
              transactionTitle.SESSION_CREATED,
            ],
          },
          ...(status
            ? {
                status: (PAYMENT_STATUS as any)[status],
              }
            : {}),
          ...(type
            ? {
                title: (transactionTitle as any)[type],
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
