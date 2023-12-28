import { Request, Response } from "express";
import { UserService } from "../Models/UserService";
import { User } from "../Models/User";
import { EUROPIAN_DIAL_CODES } from "../../utils/constantFiles/europianDialCode";

export class UserServiceController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;

    const dataToSave = {
      userId: req?.user,
      ...input,
    };
    try {
      const details = await UserService.create(dataToSave);
      await User.findByIdAndUpdate(req?.user, { userServiceId: details.id });

      return res.json({ data: details });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
  static europeanDialCodes = (req: Request, res: Response) => {
    try {
      const countryData = EUROPIAN_DIAL_CODES;

      const  countries = countryData
        .trim()
        .split("\n")
        .map((line) => {
          const [, , countryCode, mobilePrefixCode] = line.split(" - ");
          return {
            mobilePrefixCode,
            label: countryCode,
          };
        });
      res.json(countries);
    } catch (error) {
      console.error("Error processing country codes:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
