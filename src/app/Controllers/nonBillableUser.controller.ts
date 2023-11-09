import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import { sendEmailToInvitedAdmin } from "../Middlewares/mail";
import { User } from "../Models/User";
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../utils/constantFiles/OnBoarding.keys";
import { createCustomerOnRyft } from "../../utils/createCustomer/createOnRyft";
import {
  BUSINESS_DETAILS,
  // CARD_DETAILS,
  LEAD_DETAILS,
} from "../../utils/constantFiles/signupFields";

const LIMIT = 10;
export class nonBillableUsersController {
  static create = async (_req: Request, res: Response) => {
    const input = _req.body;
    //@ts-ignore
    try {
      const checkExist = await User.findOne({
        //@ts-ignore
        email: input.email,
        isDeleted: false,
        role: {
          $in: [
            RolesEnum.ADMIN,
            RolesEnum.USER,
            RolesEnum.SUBSCRIBER,
            RolesEnum.SUPER_ADMIN,
            RolesEnum.ACCOUNT_MANAGER,
            RolesEnum.NON_BILLABLE,
            RolesEnum.INVITED,
          ],
        },
      });
      if (checkExist) {
        return res
          .status(400)
          .json({ error: { message: "Eamil already exist" } });
      } else {
        const salt = genSaltSync(10);
        const text = randomString(8, true);
        console.log("🚀 PASSWORD --->", text);
        const credentials = {
          email: input.email,
          password: text,
          name: input?.firstName + " " + input?.lastName,
        };
        sendEmailToInvitedAdmin(input.email, credentials);
        const hashPassword = hashSync(text, salt);
        //@ts-ignore
        const allInvites = await User.findOne({ role: RolesEnum.NON_BILLABLE })
          .sort({ rowIndex: -1 })
          .limit(1);
        const accManagers = await User.aggregate([
          { $match: { role: RolesEnum.ACCOUNT_MANAGER } },
          { $sample: { size: 1 } },
        ]);
        let accountManager = accManagers[0];
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
          accountManager: accountManager._id,
          isCreditsAndBillingEnabled: false,
          onBoarding: [
            {
              key: ONBOARDING_KEYS.BUSINESS_DETAILS,
              pendingFields: [
                BUSINESS_DETAILS.BUSINESS_INDUSTRY,
                BUSINESS_DETAILS.BUSINESS_NAME,
                BUSINESS_DETAILS.BUSINESS_SALES_NUMBER,
                BUSINESS_DETAILS.BUSINESS_POST_CODE,
                BUSINESS_DETAILS.ADDRESS1,
                BUSINESS_DETAILS.BUSINESS_OPENING_HOURS,
                BUSINESS_DETAILS.BUSINESS_CITY,
              ],
              dependencies: [],
            },
            {
              key: ONBOARDING_KEYS.LEAD_DETAILS,
              pendingFields: [
                LEAD_DETAILS.DAILY,
                LEAD_DETAILS.LEAD_SCHEDULE,
                LEAD_DETAILS.POSTCODE_TARGETTING_LIST,
              ],
              dependencies: [BUSINESS_DETAILS.BUSINESS_INDUSTRY],
            },
            {
              key: ONBOARDING_KEYS.CARD_DETAILS,
              pendingFields: [],
              dependencies: [],
            },
          ],
          onBoardingPercentage: ONBOARDING_PERCENTAGE.USER_DETAILS,
        };

        const result = await User.create(dataToSave);
        const data = await User.findById(result.id, "-password");

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
        ? //@ts-ignore
          parseInt(_req.query.perPage)
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
      // skip = 0;
    }
    try {
      const invitedUsers = await User.find(dataToFind, "-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage);
      const count = await User.find(dataToFind, "-password");

      const totalPages = Math.ceil(count.length / perPage);
      return res.json({
        data: invitedUsers,
        meta: {
          perPage: perPage,
          page: _req.query.page || 1,
          pages: totalPages,
          total: count.length,
        },
      });
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

  static update = async (_req: Request, res: Response): Promise<any> => {
    //@ts-ignore
    const id = _req.params.id;
    //@ts-ignore
    const user = _req.user?._id;
    const input = _req.body;
    try {
      const invitedUsers = await User.findOne({
        _id: id,
        isDeleted: false,
      });
      if (!invitedUsers) {
        return res.status(400).json({ error: { message: "No User Found" } });
      }
      if (
        input.isCreditsAndBillingEnabled === true &&
        !invitedUsers.isRyftCustomer
      ) {
        const params = {
          email: invitedUsers.email,
          firstName: invitedUsers.firstName,
          lastName: invitedUsers.lastName,
          userId: invitedUsers.id,
        };

        createCustomerOnRyft(params)
          .then()
          .catch((err) => {
            return res
              .status(500)
              .json({ error: { message: "Email already exist on RYFT." } });
          });
      }
      if (
        input.isCreditsAndBillingEnabled === true &&
        !invitedUsers?.isUserSignup
      ) {
        const dataToUpdate = {
          isCreditsAndBillingEnabled: input.isCreditsAndBillingEnabled,
        };
        await User.findByIdAndUpdate(id, dataToUpdate, { new: true });
      } else {
        await User.findByIdAndUpdate(id, input, { new: true });
      }
      const user = await User.findById(id, "-password");
      return res.json({ data: user });
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
