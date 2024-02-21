import { Request, Response } from "express";
import { CreateAdBodyValidator } from "../../../Inputs/CreateAdBodyValidator.input";
import { validate } from "class-validator";
import { Ad } from "../../../Models/Ad";
import { FileEnum } from "../../../../types/FileEnum";

export const createAdAction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const reqBody = new CreateAdBodyValidator();
    reqBody.industries = req.body.industries as string[];
    (reqBody.title = req.body.title),
      (reqBody.callToAction = req.body.callToAction),
      (reqBody.description = req.body.description),
      (reqBody.buttonText = req.body.buttonText),
      (reqBody.startDate = req.body.startDate),
      (reqBody.endDate = req.body.endDate);
    reqBody.targetReach = req.body.targetReach * 1;

    const validationErrors = await validate(reqBody);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid request body", validationErrors },
      });
    }

    const ad = await Ad.create({
      ...reqBody,
      ...(reqBody.targetReach ? { isTargetReachedEnable: true } : {}),
      ...(req.file ? { image: `${FileEnum.AD}${req?.file.filename}` } : {}),
    });
    return res.json({ data: ad, message: "Partner ad created successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
