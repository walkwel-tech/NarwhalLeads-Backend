import { Request, Response } from "express";
import { FileEnum } from "../../types/FileEnum";
import { TermsAndConditions } from "../Models/TermsAndConditions";

export class TermsAndConditionsController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    try {
      await TermsAndConditions.updateOne(
        {},
        {
          content: input.content,
        },
        { new: true }
      );
      return res.json({ data: "Terms And Conditions Updated Successfully!" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static show = async (req: Request, res: Response) => {
    try {
      const content = await TermsAndConditions.findOne();
      return res.json({ data: content });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showFile = async (req: Request, res: Response) => {
    try {
      let image = `${FileEnum.TERMS_AND_CONDITIONS}Narwhal-Ts&Cs.pdf`;
      return res.json({ path: image });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}
