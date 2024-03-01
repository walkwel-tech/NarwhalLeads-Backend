import { Request, Response } from "express";
import { FreeCreditsLink } from "../../../Models/freeCreditsLink";
import { FreeCreditsLinkContent } from "../../../Models/FreeCreditsLinkContent";
export const getFreeCreditLinkContent = async (req: Request, res: Response) => {
  try {
    const code = req.params.code;

    const freeCreditsLink = await FreeCreditsLink.findOne({ _id:code });
    if (!freeCreditsLink) {
      return res
        .status(404)
        .json({ error: { message: "Promolink not found" } });
    }

    const freeCreditLinkContent = await FreeCreditsLinkContent.findOne({
      promolink: freeCreditsLink._id,
    });
    if (!freeCreditLinkContent) {
      return res
        .status(404)
        .json({ error: { message: "PromolinkContent not found" } });
    }

    return res.status(200).json({ data: freeCreditLinkContent });
  } catch (error) {
    return res
      .status(500)
      .json({
        error: { message: "Something went wrong", details: error.message },
      });
  }
};
