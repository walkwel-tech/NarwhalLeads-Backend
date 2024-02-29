import { FreeCreditsConfig } from "../../../Models/FreeCreditsConfig";
import { Request, Response } from "express";


export const getFreeCreditsConfig = async (req: Request, res: Response) => {
    try {
      const data = await FreeCreditsConfig.aggregate([
        {
          $replaceRoot: {
            newRoot: {
              $arrayToObject: [
                [
                  {
                    k: "$tag",
                    v: {
                      enabled: "$enabled",
                      amount: "$amount",
                    },
                  },
                ],
              ],
            },
          },
        },
      ]);

      const result = Object.assign({}, ...data);

      return res.json({ data: result });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };