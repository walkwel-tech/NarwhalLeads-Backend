import { RolesEnum } from "../../types/RolesEnum";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
import {
  send_email_for_outOfFunds,
  send_email_for_total_lead,
} from "../Middlewares/mail";
import { Leads } from "../Models/Leads";
import { User } from "../Models/User";

const cron = require("node-cron");

export const mailForTotalLeadsInDay = async () => {
  // cron.schedule("* * * * *", async () => {
  cron.schedule("59 23 * * *", async () => {
    const today = new Date(
      new Date(
        new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      )
        .toISOString()
        .split("T")[0]
    );
    const user = await User.find().populate("userLeadsDetailsId");
    user.map(async (i) => {
      const leads = await Leads.find({
        bid: i.buyerId,
        createdAt: { $gte: today },
      });

      if (
        leads.length != 0 &&
              //@ts-ignore
        i.userLeadsDetailsId?.leadAlertsFrequency == leadsAlertsEnums.DAILY
      ) {
        const message: any = {
          totalLeads: leads.length,
          leads: leads[0].leads,
        };
        send_email_for_total_lead(i.email, message);
      }
    });
  });
};


export const outOfFunds =  () => {
cron.schedule('2 */24 * * *', async() => {
  // cron.schedule('* * * * *', async() => {

  const users = await User.find({ role: RolesEnum.USER, credits: 0 });
  users.map((i: any) => {
    send_email_for_outOfFunds(i.email, {
      name: i.firstName + " " + i.lastName,
      credits: i.credits,
    });
  });
})
}