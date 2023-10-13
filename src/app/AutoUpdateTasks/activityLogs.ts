import { ActivityLogsInterface } from "../../types/ActivityLogInterface";
import {
  BusinessDetailsInterface,
  isBusinessObject,
} from "../../types/BusinessInterface";
import { UserInterface } from "../../types/UserInterface";
import { activityLogsWebhookUrl } from "../../utils/webhookUrls/activityLogsWebhook";
import { ActivityLogs } from "../Models/ActivityLogs";
import { User } from "../Models/User";
import * as cron from "node-cron";

type UserPromise = {
  buyerId: string | null;
  businessName: string | null;
  updatedValue: string | null;
};

export const activityLogs = async () => {
  cron.schedule("*/10 * * * *", async () => {
    const currentTime = new Date();
    const tenMinutesAgo = new Date(currentTime);
    tenMinutesAgo.setMinutes(currentTime.getMinutes() - 10);
    const activity = await ActivityLogs.find({
      createdAt: { $gte: tenMinutesAgo, $lt: currentTime },
    });
    const userDataPromises: Array<Promise<UserPromise>> = activity.map(
      async (activity: ActivityLogsInterface) => {
        const user: UserInterface =
          (await User.findOne({
            _id: activity.userEntity,
            isSignUpCompleteWithCredit: true,
            isDeleted: false,
          }).populate("businessDetailsId")) ?? ({} as UserInterface);

        const userBusiness: BusinessDetailsInterface | null = isBusinessObject(
          user.businessDetailsId
        )
          ? user.businessDetailsId
          : null;

        return (
          user.id !== null
            ? {
                buyerId: user.buyerId,
                businessName: userBusiness?.businessName ?? "",
                updatedValues: activity.modifiedValues,
              }
            : {
                buyerId: null,
                businessName: null,
                updatedValue: null,
              }
        ) as UserPromise;
      }
    );

    const userData = await Promise.all(userDataPromises);
    if (userData.length > 0) {
      await activityLogsWebhookUrl(userData);
    } else {
      console.log("No Data For 10 minutes Cron job");
    }
  });
};
