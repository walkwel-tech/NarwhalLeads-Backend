import { Response } from "express";
import { User } from "../../../Models/User";
import { UserInterface } from "../../../../types/UserInterface";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import { sendLeadDataToZap } from "../../../../utils/webhookUrls/sendDataZap";

export const sendTestLeadDataAction = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const input = req.body;
      const checkUser = (await User.findById(id)) ?? ({} as UserInterface);
      if (!checkUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({ error: { message: "lead details not found" } });
      }
      const industry = await BuisnessIndustries.findById(
        checkUser.businessIndustryId
      );
      const columns = industry?.columns;

      const result: { [key: string]: string } = {};
      if (columns) {
        for (const item of columns) {
          if (item.isVisible === true) {
            //@ts-ignore
            result[item.originalName] = item.displayName;
          }
        }
      }
      let message = "";
      let response = {};
      let status;
      try {
        await sendLeadDataToZap(input.zapierUrl, result, checkUser);
        message = "Test Lead Sent!";
        response = { data: message };
        status = 200;
      } catch (err) {
        message = "Error while sending Test Lead!";
        status = 400;
        response = { data: message };
      }

      return res.status(status).json(response);

      // return res.json({ data: { message: message } });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };