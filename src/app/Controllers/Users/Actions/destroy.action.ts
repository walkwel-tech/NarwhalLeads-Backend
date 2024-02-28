import {Request, Response} from "express"
import { User } from "../../../Models/User";
import { RolesEnum } from "../../../../types/RolesEnum";
import { BusinessDetails } from "../../../Models/BusinessDetails";
import { UserLeadsDetails } from "../../../Models/UserLeadsDetails";
import { CardDetails } from "../../../Models/CardDetails";
import { deleteCustomerOnRyft } from "../../../../utils/createCustomer/deleteFromRyft";
import logger from "../../../../utils/winstonLogger/logger";

export const destroyAction = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const userExist = await User.findById(id);
    if (userExist?.isDeleted) {
      return res
        .status(400)
        .json({ error: { message: "User has been already deleted." } });
    }
    if (userExist?.role === RolesEnum.ACCOUNT_MANAGER) {
      const usersAssign = await User.find({ accountManager: userExist.id });
      if (usersAssign.length > 0) {
        await Promise.all(
          usersAssign.map(async (user) => {
            await User.findByIdAndUpdate(user.id, { accountManager: null });
          })
        );
      }
    }

    try {
      const user = await User.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
      });
      await BusinessDetails.findByIdAndUpdate(userExist?.businessDetailsId, {
        isDeleted: true,
      });
      await UserLeadsDetails.findByIdAndUpdate(userExist?.userLeadsDetailsId, {
        isDeleted: true,
      });
      await CardDetails.deleteMany({ userId: userExist?.id });

      deleteCustomerOnRyft(user?.ryftClientId as string)
        .then((res) => logger.info("deleted customer", { res }))
        .catch((err) => logger.error("error while deleting customer on ryft", err))

      if (!user) {
        return res
          .status(400)
          .json({ error: { message: "User to delete does not exists." } });
      }

      return res.json({ message: "User deleted successfully." });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };