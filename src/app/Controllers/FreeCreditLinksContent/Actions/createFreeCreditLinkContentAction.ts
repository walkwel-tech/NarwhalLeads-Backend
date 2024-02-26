import { Request, Response } from "express";
import { validate } from "class-validator";
import { FreeCreditLinkContentValidator } from "../Inputs/PromoLinkContentValidator";
import { FreeCreditsLinkContent } from "../../../Models/FreeCreditsLinkContent";
import { FreeCreditsLink } from "../../../Models/freeCreditsLink";

export const createFreeCreditLinkContent = async (
  req: Request,
  res: Response
) => {
  try {
    const input = req.body;

    const reqBody = new FreeCreditLinkContentValidator();
    (reqBody.heroSection = input.heroSection),
      (reqBody.leadShowCase = input.leadShowCase),
      (reqBody.promoLink = input.promoLink),
      (reqBody.qualityLeads = input.qualityLeads),
      (reqBody.replacementPolicyText = input.replacementPolicyText),
      (reqBody.replacementPolicyHeader = input.replacementPolicyHeader),
      (reqBody.badgeTitle = input.badgeTitle);
      reqBody.badgeSubTitle = input.badgeSubTitle;
      reqBody.badgeColor = input.badgeColor;

    const validationErrors = await validate(reqBody);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid request body", validationErrors },
      });
    }
    const promolink = await FreeCreditsLink.findById(reqBody.promoLink);
    if (!promolink) {
      throw new Error("Promolink Not Found");
    }

    const document = {
      promolink: reqBody.promoLink,
      badgeTitle: reqBody.badgeTitle || "",
      badgeSubTitle: reqBody.badgeSubTitle || "",
      badgeColor: reqBody.badgeColor || "",
      heroSection: reqBody.heroSection || "",
      qualityLeads: reqBody.qualityLeads || "",
      leadShowCase: reqBody.leadShowCase || "",
      replacementPolicyHeader: reqBody.replacementPolicyHeader || "",
      replacementPolicyText: reqBody.replacementPolicyText || "",
    };

    const savedDocument = await FreeCreditsLinkContent.create(document);

    return res.status(200).json({
      message: "Data saved successfully",
      data: savedDocument,
    });
  } catch (err) {
    console.log(JSON.stringify(err), " error ");
    return res.status(500).json({
      error: { message: "Something went wrong", err },
    });
  }
};
