import { Request, Response } from "express";
import { UserInterface } from "../../../../types/UserInterface";
import { Ad } from "../../../Models/Ad";
import { Types } from "mongoose";

const LIMIT_ADD = 4;

export const getAdsBasedOnUserAction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const user = req.user;
    const buisnessIndustryId = (user as UserInterface).businessIndustryId;

    if (!buisnessIndustryId) {
      return res.status(400).json({ error: "buisness industry not found" });
    }
    const currentDateUTC = new Date();
    console.log("Current Date UTC:", currentDateUTC.toISOString());
    const ads = await Ad.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          industries: {
            $in: [new Types.ObjectId(buisnessIndustryId)],
          },
          $and: [
            { startDate: { $lte: currentDateUTC } },
            { endDate: { $gte: currentDateUTC } },
          ],
        },
      },

      {
        $limit: LIMIT_ADD,
      },
    ]);

    return res.json({ ads });
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
