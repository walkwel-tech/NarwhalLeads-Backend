import { Types } from "mongoose";
import { User } from "../../Models/User";
import { userStatus } from "../../Inputs/GetClients.input";
import logger from "../../../utils/winstonLogger/logger";

const daysAgo = (day: number) =>
  new Date(Date.now() - day * 24 * 60 * 60 * 1000);

export async function processUsers(userId: Types.ObjectId) {
  const user = await User.aggregate([
    {
      $match: {
        _id: userId,
      },
    },
    {
      $lookup: {
        from: "transactions",
        // localField: "_id",
        // foreignField: "userId",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userId"] },
                  { $eq: ["$status", "success"] },
                  { $eq: ["$title", "Credits Added"] },
                ],
              },
            },
          },
        ],
        as: "userTransactions",
      },
    },
    {
      $addFields: {
        latestTransaction: {
          $max: "$userTransactions.createdAt",
        },
      },
    },
    {
      $addFields: {
        clientStatus: {
          $cond: {
            if: { $eq: ["$isDeleted", true] },
            then: userStatus.LOST,
            else: {
              $cond: {
                if: {
                  $gte: ["$latestTransaction", daysAgo(60)],
                },
                then: userStatus.ACTIVE,
                else: {
                  $cond: {
                    if: {
                      $eq: [{ $size: "$userTransactions" }, 0],
                    },
                    then: userStatus.PENDING,
                    else: userStatus.INACTIVE,
                  },
                },
              },
            },
          },
        },
      },
    },
  ]);

  const updatedUsers = await User.updateOne(
    { _id: userId },
    { $set: { clientStatus: user[0].clientStatus } },
    { new: true }
  );
  logger.info(
    `Updated reportingStatus for user ${userId}, ${new Date()}`,
    JSON.stringify(updatedUsers)
  );
}
