import { Request, Response } from "express";

import { SiteConfig } from "../Models/SiteConfig";
import { ROUND_TABLE_MANAGER } from "../../utils/constantFiles/siteConfig";
import { User } from "../Models/User";

export class SiteConfigController {
  static create = async (req: Request, res: Response): Promise<Response> => {
    try {
      let input = req.body;
      const existingMangers = await User.find({
        _id: { $in: input.accountManagers },
      });
      if (existingMangers.length !== input.accountManagers.length) {
        return res
          .status(400)
          .json({
            message:
              "Invalid Data. You might be trying to add an Account Manager that no longer exists.",
          });
      }

      const siteConfig = await SiteConfig.updateOne(
        { key: ROUND_TABLE_MANAGER },
        {
          $set: {
            roundManagers: input.accountManagers,
            key: ROUND_TABLE_MANAGER,
          },
        },
        { upsert: true }
      );
      // const siteConfig = await allocateManagerToUser()

      return res.json({
        data: siteConfig,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };
}
