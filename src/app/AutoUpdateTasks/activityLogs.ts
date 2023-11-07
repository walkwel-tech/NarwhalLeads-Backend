import { ActivityLogsInterface } from "../../types/ActivityLogInterface";

import { UserInterface } from "../../types/UserInterface";
import { activityLogsWebhookUrl } from "../../utils/webhookUrls/activityLogsWebhook";
import { ActivityLogs } from "../Models/ActivityLogs";
import { BusinessDetails } from "../Models/BusinessDetails";
import { User } from "../Models/User";
import * as cron from "node-cron";

export const activityLogs = async () => {
  cron.schedule("*/10 * * * *", async () => {
    // cron.schedule("* * * * *", async () => {
    const currentTime = new Date();
    const tenMinutesAgo = new Date(currentTime);
    tenMinutesAgo.setMinutes(currentTime.getMinutes() - 10);
    const activity = await ActivityLogs.find({
      createdAt: { $gte: tenMinutesAgo, $lt: currentTime },
    });
    const userDataPromises = activity.map(
      async (activity: ActivityLogsInterface) => {
        const user: UserInterface =
          (await User.findOne({
            _id: activity.userEntity,
            isSignUpCompleteWithCredit: true,
            isDeleted: false,
          }).populate("businessDetailsId")) ?? ({} as UserInterface);
        const userBusiness = await BusinessDetails.findById(
          user.businessDetailsId
        );
        return {
          buyerId: user.buyerId,
          businessName: userBusiness?.businessName,
          updatedValues: activity.modifiedValues,
        };
      }
    );

    const userData = await Promise.all(userDataPromises);
    if (userData.length > 0) {
      await activityLogsWebhookUrl(userData);
    } else {
      console.log("No Data Found for 10 minutes activity logs");
    }
  });
};
