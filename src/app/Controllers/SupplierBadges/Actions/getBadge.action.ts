import { Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import { getBadgeTypeFromString } from "../../../../types/AllowedBadgeTypes";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import { Types } from "mongoose";

export const getBadgeAction = async (req: Request, res: Response) => {
  try {
    const { industrySlug, type } = req.params;
    const industry = await BuisnessIndustries.findOne({ _id: new Types.ObjectId(industrySlug) });

    console.log("LK", industry, req.params);

    const badgeType = getBadgeTypeFromString(type);

    if (!industry) {
      return res.status(404).json({ error: "Industry not found" });
    }

    if (!badgeType) {
      return res.status(404).json({ error: "Invalid badge found." });
    }

    const supplierBadge = industry.supplierBadges?.find(
      (badge) => badge.type === badgeType
    );

    console.log(supplierBadge, ">>>>><", industry)
    if (supplierBadge) {
      const imageBuffer = await axios.get(supplierBadge.src, {
        responseType: "arraybuffer",
      });
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(imageBuffer.data);
    } else {
      // Return default image for the type.

      return fs.readFile(
        `src/assets/partnerImages/SpotDif_Partner_${badgeType}.webp`,
        (err, data) => {
          if (err) {
            return res.status(404).json({ error: "Something went wrong." });
          }
          res.setHeader("Content-Type", "image/jpeg");
          return res.send(data);
        }
      );
    }
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
