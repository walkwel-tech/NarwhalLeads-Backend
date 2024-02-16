import { Request, Response } from "express";
import { SupplierBadgesStatus } from "../../../../utils/Enums/SupplierBadgesStatus";
import { SupplierLink } from "../../../Models/SupplierLink";
import { UserInterface } from "../../../../types/UserInterface";

export const getMyBadgeDetail = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.user as UserInterface;

    const badgesCredits = await SupplierLink.aggregate([
      {
        $match: {
          userId: user?._id,
        },
      },
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
    ]);

    res.json({ data: badgesCredits });
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
