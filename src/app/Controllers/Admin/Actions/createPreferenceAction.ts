import { UserInterface } from "../../../../types/UserInterface";
import { ClientTablePreferenceInterface } from "../../../../types/clientTablePrefrenceInterface";
import { ClientTablePreference } from "../../../Models/ClientTablePrefrence";
import { Request, Response } from "express";


export const createPreference = async (
    // req: Request<QueryParams, {}>,
    req: Request,
    res: Response
  ) => {
    const input = req.body;
    let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
    try {
      const checkExist = await ClientTablePreference.findOne({
        userId: user.id,
      });
      if (!checkExist) {
        const columns = input?.columns;
        let dataToSave: Partial<ClientTablePreferenceInterface> =
          {
            columns,
            userId: user?._id,
          } ?? ({} as ClientTablePreferenceInterface);
        const Preference = await ClientTablePreference.create(dataToSave);
        return res.json({ data: Preference });
      } else {
        const data = await ClientTablePreference.findByIdAndUpdate(
          checkExist._id,
          { columns: input.columns, userId: user?._id },
          { new: true }
        ).lean();
        const col = data?.columns;
        return res.json({ data: { ...data, columns: col } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };