import { activityLogsWebhookUrl } from "../../utils/webhookUrls/activityLogsWebhook";
import { ActivityLogs } from "../Models/ActivityLogs";
import { User } from "../Models/User";
import * as cron from "node-cron"


export const activityLogs = async () => {
  cron.schedule("*/10 * * * *", async () => {
    const currentTime = new Date();
    const tenMinutesAgo = new Date(currentTime);
    tenMinutesAgo.setMinutes(currentTime.getMinutes() - 10);
    const activity = await ActivityLogs.find({
      createdAt: { $gte: tenMinutesAgo, $lt: currentTime },
    });

    const userDataPromises = activity.map(async (activity: any) => {
      const user: any = await User.findById(activity.userEntity).populate(
        "businessDetailsId"
      );
      return {
        buyerId: user?.buyerId,
        businessName: user?.businessDetailsId?.businessName,
        updatedValues: activity.modifiedValues,
      };
    });
    const userData = await Promise.all(userDataPromises);
    await activityLogsWebhookUrl(userData);
  });
};
