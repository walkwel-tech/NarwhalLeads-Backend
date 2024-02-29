import { Request, Response } from "express";
import { UpdateAdBodyValidator } from "../../../Inputs/UpdateAdBodyValidator.input";
import { validate } from "class-validator";
import { Ad } from "../../../Models/Ad";
import fs from "fs";
import { FileEnum } from "../../../../types/FileEnum";

export const updateAdAction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const reqBody = new UpdateAdBodyValidator();
    reqBody.industries = req.body.industries as string[];
    (reqBody.title = req.body.title),
      (reqBody.callToAction = req.body.callToAction),
      (reqBody.description = req.body.description),
      (reqBody.buttonText = req.body.buttonText),
      (reqBody.startDate = req.body.startDate),
      (reqBody.endDate = req.body.endDate);
    reqBody.isActive = req.body.isActive;
    reqBody.isTargetReachedEnable = req.body.isTargetReachedEnable;
    req.body.targetReach
      ? (reqBody.targetReach = req.body.targetReach * 1)
      : "";
    //  reqBody.targetReach = req.body.targetReach ? req.body.targetReach * 1 : ''

    const validationErrors = await validate(reqBody);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid request body", validationErrors },
      });
    }
    const id = req.params.id;

    const adCheck = await Ad.findById(id);

    if (!adCheck || adCheck.isDeleted) {
      return res.status(404).json({ error: "Ad not found" });
    }
    const ad = await Ad.findByIdAndUpdate(
      id,
      {
        ...reqBody,
        ...(req.file ? { image: `${FileEnum.AD}${req?.file.filename}` } : {}),
      },
      { new: true }
    );
    if (req.file) {
      fs.unlink(process.cwd() + "/public" + adCheck.image, (err) => {
        if (err) {
          console.error("Error deleting previous image:", err);
        }

        console.log("Previous image deleted successfully.");
      });
    }

    return res.json({ data: { message: "Ad updated succesfully", ad } });
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
