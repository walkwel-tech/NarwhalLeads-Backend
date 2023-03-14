import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import { send_email_to_invited_user } from "../Middlewares/mail";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { User } from "../Models/User";

export class invitedUsersController {
  static create = async (_req: Request, res: Response) => {
    const input = _req.body;
    //@ts-ignore
    const user = await User.findById(_req.user?.id).populate(
      "businessDetailsId"
    );
    try {
      const checkExist = await User.findOne({
        //@ts-ignore
        invitedById: _req?.user?.id,
        email: input.email,
      });
      if (checkExist) {
        return res
          .status(400)
          .json({ error: { message: "User already invited" } });
      }
      const existingCustomerCheck = await User.findOne({
        email: input.email,
      });
      if (existingCustomerCheck) {
        return res
          .status(400)
          .json({ error: { message: "Already a member of this portal" } });
      } else {
        const salt = genSaltSync(10);
        const text = randomString(8, true);
        console.log("🚀 PASSWORD --->", text);
        const credentials = {
          email: input.email,
          password: text,
          //@ts-ignore
          businessName: user?.businessDetailsId?.businessName,
        };
        send_email_to_invited_user(input.email, credentials);
        const hashPassword = hashSync(text, salt);
        //@ts-ignore
        const allInvites = await User.findOne({ invitedById: _req?.user?.id })
          .sort({ rowIndex: -1 })
          .limit(1);
        const dataToSave = {
          firstName: " ",
          lastName: " ",
          email: input.email,
          password: hashPassword,
          role: RolesEnum.INVITED,
          //@ts-ignore
          invitedById: _req.user._id,
          businessDetailsId: user?.businessDetailsId,
          userLeadsDetailsId: user?.userLeadsDetailsId,
          isActive: true,
          isVerified: true,
          //@ts-ignore
          rowIndex: allInvites?.rowIndex + 1 || 0,
        };

        const data = await User.create(dataToSave);
        const leadPrefrence = await LeadTablePreference.findOne({
          //@ts-ignore

          userId: _req?.user?.id,
        });
        if (leadPrefrence) {
          await LeadTablePreference.create({
            userId: data.id,
            columns: leadPrefrence.columns,
          });
        }
        return res.json({ data: data });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static show = async (_req: Request, res: Response) => {
    //@ts-ignore

    const user = _req.user?._id;
    try {
      const invitedUsers = await User.find({
        invitedById: user,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No Data Found" } });
      } else {
        return res.json({ data: invitedUsers });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static delete = async (_req: Request, res: Response) => {
    //@ts-ignore
    const id = _req.params.id;
    //@ts-ignore
    const user = _req.user?._id;
    try {
      const invitedUsers = await User.find({
        invitedById: user,
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No User Found" } });
      } else {
        await User.findByIdAndUpdate(id, { isDeleted: true });
        return res.json({ data: { message: "User Deleted!" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}

function randomString(length: number, isSpecial: any) {
  const normalCharacters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const specialCharacters = "@#&?/*";
  var characterList = normalCharacters;
  var result = "";
  if (isSpecial) {
    characterList += specialCharacters;
  }
  while (length > 0) {
    // Pick random index from characterList
    var index = Math.floor(Math.random() * characterList.length);
    result += characterList[index];
    length--;
  }
  return result + "$";
}
