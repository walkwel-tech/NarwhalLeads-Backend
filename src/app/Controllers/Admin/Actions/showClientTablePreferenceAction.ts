import { UserInterface } from "../../../../types/UserInterface";
import { clientTablePreference } from "../../../../utils/constantFiles/clientTablePreferenceAdmin";
import { ClientTablePreference } from "../../../Models/ClientTablePrefrence";
import { Request, Response } from "express";


export const showClientTablePreference = async (
    // req: Request<QueryParams, {}, {}, Record<string, any>>,
    req: Request,
    res: Response
  ) => {
    try {
      let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);

      const Preference = await ClientTablePreference.findOne({
        userId: user?.id,
      });
      if (Preference) {
        return res.json({ data: Preference });
      } else {
        const data = clientTablePreference;
        return res.json({ data: { columns: data } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };