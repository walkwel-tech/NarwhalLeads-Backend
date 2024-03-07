import { Response } from "express";
import { User } from "../../../Models/User";
// import { UserInterface } from "@spotdif/types/UserInterface";
import { Transaction } from "../../../Models/Transaction";
import { transactionTitle } from "../../../../utils/Enums/transaction.title.enum";
import { PAYMENT_STATUS } from "../../../../utils/Enums/payment.status";
import { leadsStatusEnums } from "../../../../utils/Enums/leads.status.enum";
import { Leads } from "../../../Models/Leads";
import { convertData } from "./convertData";
import {UserInterface} from "../../../../types/UserInterface";

export const accountManagerStatsAction = async (req: any, res: Response) => {
    try {
      const input = req.body;
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const year: any = new Date().getFullYear();
      const difference: number = endDate.getTime() - startDate.getTime();
      const differenceMs: number = Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );

      let days = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ];
      const labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      let accountManagersId = input.accountManagerIds;
      let userObj: Object[] = [];
      let rawDataInDaysForRejectedLeads;
      let rawDataInDaysForRequestedLeads;
      await Promise.all(
        accountManagersId.map(async (id: string) => {
          let bids: string[] = [];
          let credits: number[] = [];
          let txn: number[] = [];
          let leadsRequested;
          let leadRejected;
          const manager = await User.findById(id);
          if (manager) {
            const res = await User.find({
              accountManager: id,
              createdAt: { $gte: startDate, $lte: endDate },
            }).populate("accountManager");
            let obj: Record<string, string | number> = {};
            //@ts-ignore
            obj.name = manager?.firstName;

            res.forEach(async (user: UserInterface) => {
              if (user.buyerId) bids.push(user.buyerId);
              credits.push(user.credits);
              let txns = await Transaction.find({
                userId: user?.id,

                title: transactionTitle.CREDITS_ADDED,

                status: PAYMENT_STATUS.CAPTURED,

                createdAt: { $gte: startDate, $lte: endDate },
              });
              if (txns) txn.push(txns.length);
            });
            if (differenceMs < 30) {
              leadRejected = await Leads.find({
                bid: { $in: bids },
                status: leadsStatusEnums.REPORT_REJECTED,
                createdAt: { $gte: startDate, $lte: endDate },
              });

              leadsRequested = await Leads.aggregate([
                {
                  $match: {
                    bid: { $in: bids },
                    status: leadsStatusEnums.VALID,
                    createdAt: {
                      $gte: startDate,
                      $lt: endDate,
                    },
                  },
                },
                {
                  $addFields: {
                    dayOfMonth: { $dayOfMonth: "$createdAt" },
                  },
                },
                {
                  $group: {
                    _id: {
                      dayOfMonth: "$dayOfMonth",
                      year: { $year: "$createdAt" },
                    },
                    count: { $sum: 1 },
                  },
                },

                {
                  $project: {
                    _id: 0,
                    dayOfMonth: "$_id.dayOfMonth",
                    year: "$_id.year",
                    count: 1,
                  },
                },
                {
                  $sort: {
                    dayOfMonth: 1,
                  },
                },
              ]);
              (rawDataInDaysForRejectedLeads = leadRejected.length),
                (rawDataInDaysForRequestedLeads = convertDataForDaysInMonth(
                  leadsRequested,
                  days,
                  year
                ));
            } else {
              leadRejected = await Leads.find({
                bid: { $in: bids },
                status: leadsStatusEnums.REPORT_REJECTED,
                createdAt: { $gte: startDate, $lte: endDate },
              });
              leadsRequested = await Leads.aggregate([
                {
                  $match: {
                    bid: { $in: bids },
                    status: leadsStatusEnums.VALID,
                    createdAt: {
                      $gte: startDate,
                      $lt: endDate,
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      year: { $year: "$createdAt" },

                      month: { $month: "$createdAt" },
                    },
                    count: { $sum: 1 },
                  },
                },
                {
                  $addFields: {
                    monthName: {
                      $let: {
                        vars: {
                          monthsInString: [
                            null,
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ],
                        },
                        in: {
                          $arrayElemAt: ["$$monthsInString", "$_id.month"],
                        },
                      },
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    monthName: 1,
                    count: 1,
                  },
                },
                {
                  $sort: {
                    year: 1,
                    month: 1,
                  },
                },
              ]);
              rawDataInDaysForRejectedLeads = leadRejected.length;
              rawDataInDaysForRequestedLeads = convertData(
                leadsRequested,
                labels,
                year
              );
            }

            //@ts-ignore
            obj.leadsRejectedCount = rawDataInDaysForRejectedLeads;
            //@ts-ignore
            obj.leadsRequestedCount = rawDataInDaysForRequestedLeads;
            let creditsTotal;
            if (credits.length > 0) {
              creditsTotal = credits.reduce((acc, cor) => {
                return acc + cor;
              });
            } else {
              creditsTotal = 0;
            }

            let txnTotal;
            if (txn && txn.length > 0) {
              txnTotal = txn.reduce((acc, cor) => {
                return acc + cor;
              });
            } else {
              txnTotal = 0;
            }

            obj.creditsSum = creditsTotal;
            if (txnTotal > 0) {
              obj.creditsCount = txnTotal;
              obj.creditsAvg = Math.ceil(creditsTotal / txnTotal);
            } else {
              obj.creditsCount = 0;
              obj.creditsAvg = creditsTotal;
            }

            userObj.push(obj);
          }
        })
      );
      return res.json({ data: userObj });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  function convertDataForDaysInMonth(data: any, labels: any, year: any) {
    // Initialize an array of 12 elements with all zeros
    const dataArr = Array(31).fill(0);

    // Loop through each object in the data array and update the corresponding element in dataArr
    data.forEach((obj: any) => {
      const index = obj.dayOfMonth - 1;
      if (obj.year != year) {
      } else {
        dataArr[index] += obj.count;
      }
    });
    let years: any = [];
    data.map((i: any) => {
      if (!years.includes(i.year)) {
        years.push(i.year);
      }
    });

    // Create an object with labels and data properties
    return { labels, data: dataArr, years: years };
  }
