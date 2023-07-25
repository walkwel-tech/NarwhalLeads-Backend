import { Response } from "express";
import mongoose from "mongoose";
import { Invoice } from "../Models/Invoice";
import { Transaction } from "../Models/Transaction";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
const ObjectId = mongoose.Types.ObjectId;

// const LIMIT=10
export class TransactionController {
  static show = async (_req: any, res: Response) => {
    const userId = _req.user?.id;
    try {
      let dataToFind: any = {
        userId: new ObjectId(userId),
        title:{$ne:transactionTitle.INVOICES_VAT}
      };
      const [query]: any = await Transaction.aggregate([
        {
          $facet: {
            results: [{ $match: dataToFind }, { $sort: { createdAt: -1 } }],
            transactionCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);

      const [queryInvoice]: any = await Invoice.aggregate([
        {
          $facet: {
            results: [{ $match: dataToFind }, { $sort: { createdAt: -1 } }],
            invoiceCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      return res.json({
        data: { transactions: query.results, invoices: queryInvoice.results },
      });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };
}
