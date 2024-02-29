import { Request, Response } from "express";
import { FreeCreditsLinkContent } from "../../../Models/FreeCreditsLinkContent";
import { validate } from "class-validator";
import { FreeCreditLinkContentValidator } from "../Inputs/PromoLinkContentValidator";

export const updatePromoLinkContent = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const { id } = req.params;
    const input = req.body;
  
    try {
      const validator = new FreeCreditLinkContentValidator();
      Object.assign(validator, input);
      const validationErrors = await validate(validator);
  
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }
  
      const updatedDocument = await FreeCreditsLinkContent.findByIdAndUpdate(
        id,
        input,
        { new: true }
      );
  
      if (!updatedDocument) {
        return res.status(404).json({ error: { message: "PromoLink content not found." } });
      }
  
      return res.status(200).json({ message: "PromoLink content updated successfully.", data: updatedDocument });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error: error.message } });
    }
  };