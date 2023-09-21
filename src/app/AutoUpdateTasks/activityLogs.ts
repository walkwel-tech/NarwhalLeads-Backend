import { activity_logs_webhook_url } from "../../utils/webhookUrls/activity_logs_webhook";
import { ActivityLogs } from "../Models/ActivityLogs";
import { User } from "../Models/User";
const cron = require("node-cron");

export const activityLogs = async () => {
  cron.schedule("*/10 * * * *", async () => {
    const currentTime = new Date();
    const tenMinutesAgo = new Date(currentTime);
    tenMinutesAgo.setMinutes(currentTime.getMinutes() - 10);
    const activity = await ActivityLogs.find({
      createdAt: { $gte: tenMinutesAgo, $lt: currentTime },
    });

    const userDataPromises = activity.map(async (i: any) => {
      const user: any = await User.findById(i.userEntity).populate(
        "businessDetailsId"
      );
      return {
        buyerId: user?.buyerId,
        businessName: user?.businessDetailsId?.businessName,
        updatedValues: i.modifiedValues,
      };
    });
    const userData = await Promise.all(userDataPromises);
    await activity_logs_webhook_url(userData);
  });
};
