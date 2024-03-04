import { Request, Response, NextFunction } from "express";
import { AuthKey } from "../Models/AuthKey";

export default async function CheckAccessKey(
  req: Request,
  res: Response,
  next: NextFunction
) : Promise<any> {
  try {
    const token = req.header("Authorization");
    const access = token?.split(" ")[1];
    const AuthObj = await AuthKey.findOne({ key: access });
    if (!AuthObj) {
      return res
        .status(401)
        .json({ error: { message: "Invalid Token. Access Denied!" } });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      error: { messsage: "Something went wrong", err },
    });
  }
}
