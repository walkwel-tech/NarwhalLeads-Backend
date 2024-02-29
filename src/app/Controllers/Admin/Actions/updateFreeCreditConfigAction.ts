import { FirstCardBonusInterface } from "../../../../types/FirstCardBonusInterface";
import { FreeCreditsConfig } from "../../../Models/FreeCreditsConfig";
import { Request, Response } from "express";


export const updateFreeCreditsConfig = async (req: Request, res: Response) => {
    try {
      const { enabled, amount, tags } = req.body as FirstCardBonusInterface;
      // console.log(firstCardBonus, ">>>" , req.body)
      let options = { upsert: true, new: true, setDefaultsOnInsert: true };
      await FreeCreditsConfig.findOneAndUpdate(
        { tag: "firstCardBonus" },
        { enabled, amount, tags },
        options
      );

      return res
        .status(200)
        .json({ message: "Site config updated successfully." });
    } catch (error) {
      console.log(error, ">>>>>>> error");
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };