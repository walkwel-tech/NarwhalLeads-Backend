import { Request, Response } from "express";
import { Ad } from "../../../Models/Ad";

export const updateAdClickAction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = req.params.id;
    const ad = await Ad.findById(id);

    if (!ad || ad.isDeleted) {
      return res.status(404).json({ error: "Ad not found" });
    }

    if (
      ((ad.targetReach && ad.targetReach > ad.clickTotal) ||
        !ad.isTargetReachedEnable) &&
      ad.isActive === true
    ) {
      // Increment count
      ad.clickTotal++;

      // Check if isActive should be updated
      // if (!document.isActive && document.count >= document.targetReach) {
      //     document.isActive = true;
      // }
      if (ad.clickTotal === ad.targetReach && ad.isTargetReachedEnable) {
        ad.isActive = false;
      }

      // Save the updated document
      await ad.save();

      return res.json({ message: "Click updated successfully" });
    } else {
      return res.status(400).json({
        error: "Ad is not availble at the moment",
      });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
