import { Response } from "express";
import { getUserPaymentMethods, getUsersWithAutoChargeEnabled, topUpUserForPaymentMethod } from "../../../AutoUpdateTasks/autoCharge";
import { AUTO_UPDATED_TASKS } from "../../../../utils/Enums/autoUpdatedTasks.enum";
import { AutoUpdatedTasksLogs } from "../../../Models/AutoChargeLogs";
import logger from "../../../../utils/winstonLogger/logger";

export const autoChargeNowAction = async (req: any, res: Response): Promise<any> => {
    const id = req.params.id;
    try {
      const usersToCharge = await getUsersWithAutoChargeEnabled(id);
      for (const user of usersToCharge) {
        const dataToSave = {
          userId: user.id,
          title: AUTO_UPDATED_TASKS.INSTANT_AUTO_CHARGE,
        };
        let logs = await AutoUpdatedTasksLogs.create(dataToSave);
        if (usersToCharge.length === 0) {
          return res.status(400).json({ data: "No users to charge." });
        }
        for (const user of usersToCharge) {
          const paymentMethod = await getUserPaymentMethods(user.id);

          if (paymentMethod) {
            await AutoUpdatedTasksLogs.findByIdAndUpdate(logs.id, {
              status: 200,
            });
            try {
              await topUpUserForPaymentMethod(user, paymentMethod);
              return res.json({
                data: "Payment initiated, your credits will be added soon!",
              });
            } catch (err) {
              return res
                .status(500)
                .json({ message: "Something went wrong", err });
            }
          } else {
            await AutoUpdatedTasksLogs.findByIdAndUpdate(logs.id, {
              notes: "payment method not found",
              status: 400,
            });
            return res.status(400).json({ data: "please add payment method." });
          }
        }
      }
    } catch (error) {
      logger.error(
        "Error in Auto charge:",
        error
      );
    }
  };