import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
import { sendEmaiForTotalLead } from "../Middlewares/mail";
import { Leads } from "../Models/Leads";
import { User } from "../Models/User";

import * as cron from "node-cron";

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
    const user = await User.find({ isDeleted: false }).populate(
      "userLeadsDetailsId"
    );
    let data = user.map(async (user) => {
      const leads = await Leads.find({
        bid: user.buyerId,
        createdAt: { $gte: today },
      });
      if (
        leads.length != 0 &&
        //@ts-ignore
        user.userLeadsDetailsId?.leadAlertsFrequency === leadsAlertsEnums.DAILY
      ) {
        const message: {} = {
          totalLeads: leads.length,
          leads: leads[0].leads,
        };
        sendEmaiForTotalLead(user.email, message);
      }
    });
    Promise.all(data);
  });
};

// export const outOfFunds = async () => {
//   // cron.schedule("2 */24 * * *", async () => {

//   const users = await User.find({ role: RolesEnum.USER, credits: 0 });
//   users.map((user: UserInterface) => {
//     sendEmailForOutOfFunds(user.email, {
//       name: user.firstName + " " + user.lastName,
//       credits: user.credits,
//     });
//   });
//   // });
// };
