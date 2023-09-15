import { Request, Response } from "express";
import { User } from "../../app/Models/User";
import { NOTIFICATION_TYPE } from "../Enums/notificationType.enum";
import { Notifications } from "../../app/Models/Notifications";

export const notification_webhook=async(req: Request, res: Response)=>{
let input=req.body
  const user=await User.findOne({smsPhoneNumber:input.To})
  const data = {
    userId: user?.id,
    title: "NEW LEAD",
    notificationType: NOTIFICATION_TYPE.SMS,
    MessageSid: input.MessageSid,
    MessageStatus:input.MessageStatus,
    accountId:input.AccountSid,
    toPhoneNumber:input.To
  };
await Notifications.create(data);
}