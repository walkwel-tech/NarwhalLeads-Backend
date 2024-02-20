import { ActivityLogsInterface } from "../../types/ActivityLogInterface";
import { UserInterface } from "../../types/UserInterface";
import { activityLogsWebhookUrl } from "../../utils/webhookUrls/activityLogsWebhook";
import { ActivityLogs } from "../Models/ActivityLogs";
import { BusinessDetails } from "../Models/BusinessDetails";
import { User } from "../Models/User";
import * as cron from "node-cron";
import logger from "../../utils/winstonLogger/logger";

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
      const data = transformData(userData);
      await activityLogsWebhookUrl(data);
    } else {
      logger.info(
        "No Data Found for 10 minutes activity logs",
        new Date(),
        "Today's Date"
      );
    }
  });
};
interface User {
  buyerId: string;
  businessName?: string;
  updatedValues: Array<{ [key: string]: any }>;
}

function transformData(input: User[]): any[] {
  const groupedData: { [key: string]: any } = {};

  input.forEach((user) => {
    const buyerId = user.buyerId;
    if (!groupedData[buyerId]) {
      groupedData[buyerId] = {
        buyerId: user.buyerId,
        businessName: user.businessName,
      };
    }

    user.updatedValues.forEach((updatedValue) => {
      for (const key in updatedValue) {
        groupedData[buyerId][key] = updatedValue[key];
      }
    });
  });

  return Object.values(groupedData);
}
