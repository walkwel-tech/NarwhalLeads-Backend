import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import {
    send_email_to_invited_admin,
} from "../Middlewares/mail";
import { User } from "../Models/User";

const LIMIT = 10;
export class nonBillableUsersController {
  static create = async (_req: Request, res: Response) => {
    const input = _req.body;
    //@ts-ignore
    try {
      const checkExist = await User.findOne({
        //@ts-ignore
        email: input.email,isDeleted:false
      });
      if (checkExist) {
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
          name: input?.firstName + " " + input?.lastName,
        };
        send_email_to_invited_admin(input.email, credentials);
        const hashPassword = hashSync(text, salt);
        //@ts-ignore
        const allInvites = await User.findOne({ role: RolesEnum.NON_BILLABLE })
          .sort({ rowIndex: -1 })
          .limit(1);
        const dataToSave = {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: hashPassword,
          role: RolesEnum.NON_BILLABLE,
          //@ts-ignore
          isActive: true,
          isVerified: true,
          //@ts-ignore
          rowIndex: allInvites?.rowIndex + 1 || 0,
          credits: 0,
        };

       const result= await User.create(dataToSave);
        const data = await User.findById(result.id,'-password')

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
    const perPage =
    //@ts-ignore
      _req.query && _req.query.perPage > 0
      //@ts-ignore
        ? parseInt(_req.query.perPage)
        : LIMIT;
    let skip =
    //@ts-ignore
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;
    let dataToFind: any = {
      role: RolesEnum.NON_BILLABLE,
      isDeleted: false,
      // isActive: JSON.parse(isActive?.toLowerCase()),
    };
    if (_req.query.search) {
      dataToFind = {
        ...dataToFind,
        $or: [
          //$options : 'i' used for case insensitivity search
          { email: { $regex: _req.query.search, $options: "i" } },
          { firstName: { $regex: _req.query.search, $options: "i" } },
          { lastName: { $regex: _req.query.search, $options: "i" } },
          { buyerId: { $regex: _req.query.search, $options: "i" } },
          {
            "businessDetailsId.businessName": {
              $regex: _req.query.search,
              $options: "i",
            },
          },
        ],
      };
      skip = 0;
    }
    try {
      const invitedUsers = await User.find(dataToFind, "-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage);

      // if (invitedUsers.length == 0) {
      // return res.json({ error: { message: "No Data Found" } });
      // } else {
      return res.json({ data: invitedUsers });
      // }
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

  static update = async (_req: Request, res: Response) => {
    //@ts-ignore
    const id = _req.params.id;
    //@ts-ignore
    const user = _req.user?._id;
    const input = _req.body;
    try {
      const invitedUsers = await User.find({
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No User Found" } });
      } else {
        const user = await User.findByIdAndUpdate(id, input, { new: true });

        return res.json({ data: user });
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
