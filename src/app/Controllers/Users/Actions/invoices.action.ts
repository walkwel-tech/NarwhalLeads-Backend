import { Request, Response } from "express";

export const invoicesActions = async (req: Request, res: Response): Promise<any> => {
    const user = req.user;
    try {
      //@ts-ignore
      const invoices = await Invoice.find({ userId: user.id });
      return res.json({ data: invoices });
    } catch {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };