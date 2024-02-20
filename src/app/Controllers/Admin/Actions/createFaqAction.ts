import { FAQ } from "../../../Models/Faq";
import { Request, Response } from "express";


export const createFaqs = async (req: Request, res: Response) => {
    const input = req.body;
    try {
      await FAQ.updateOne(
        {},
        {
          content: input.content,
        },
        { new: true }
      );
      return res.json({ data: "FAQs Updated Successfully!" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };