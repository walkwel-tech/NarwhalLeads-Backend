import { Request, Response } from "express";
import { Ad } from "../../../Models/Ad";

export const deleteAdAction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const id = req.params.id;
    await Ad.findByIdAndUpdate(id, { isDeleted: true });

    return res.json({ message: "Ad deleted successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ error: { message: "Something went wrong.", err } });
  }
};
