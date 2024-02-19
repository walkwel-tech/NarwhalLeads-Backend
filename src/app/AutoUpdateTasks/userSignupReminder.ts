import * as cron from "node-cron";
import { User } from "../Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { sendEmailToRemindUser25PercentSignup } from "../Middlewares/mail";
import { ONBOARDING_PERCENTAGE } from "../../utils/constantFiles/OnBoarding.keys";

export const userSignupReminder = () => {



  cron.schedule("0 0 * * *", async () => {


    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // cron.schedule("* * * * *", async () => {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    // const users = await User.find({
    //   onBoardingPercentage: ONBOARDING_PERCENTAGE.USER_DETAILS,
    //   isDeleted: false,
    //   role: RolesEnum.USER,
    //   createdAt: { $lte: threshold },
    // });
    const users = await User.aggregate([
      {
        $match: {
          onBoardingPercentage: ONBOARDING_PERCENTAGE.USER_DETAILS,
          isDeleted: false,
          role: RolesEnum.USER,
          createdAt: { $lte: threshold },
        },
      },
      {
        $lookup: {
          from: "notifications",
          localField: "_id",
          foreignField: "userId",
          as: "notifications",
        },
      },
      {
        $addFields: {
          notificationInLastSevenDays: {
            $filter: {
              input: "$notifications",
              as: "notification",
              cond: {
                $and: [
                  { $lt: ['$$notification.createdAt', sevenDaysAgo] },
                  {
                    $eq: [
                      "$$notification.templateId",
                      "d-d39ac61c21a84352b80dabd6a3d0f238",
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          notificationInLastSevenDays: {
            $ne: [],
          },
        },
      },
    ]);

    users.map((user) => {
      return new Promise((resolve, reject) => {
        const message = {
          name: `${user.firstName} ${user.lastName}`,
        };
        sendEmailToRemindUser25PercentSignup(user.email, message);
        resolve("Email Sent");
      });
    });
  });
};
