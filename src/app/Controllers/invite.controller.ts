import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import {
  sendEmailToInvitedAccountManager,
  sendEmailToInvitedAdmin,
  sendEmailToInvitedUser,
} from "../Middlewares/mail";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { User } from "../Models/User";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { UserInterface } from "../../types/UserInterface";
import { Permissions } from "../Models/Permission";
import logger from "../../utils/winstonLogger/logger";

const LIMIT = 10;
export class invitedUsersController {
  static create = async (_req: Request, res: Response) => {
    let currentUser: Partial<UserInterface> =
      _req.user ?? ({} as UserInterface);

    const input = _req.body;
    const user = await User.findById(currentUser?.id)
      .populate("businessDetailsId")
      .populate("userLeadsDetailsId");
    try {
      const checkExist = await User.findOne({
        invitedById: currentUser?.id,
        email: input.email,
        isDeleted: false,
      });
      if (checkExist) {
        return res
          .status(400)
          .json({ error: { message: "User already invited" } });
      }
      const existingCustomerCheck = await User.findOne({
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
      if (existingCustomerCheck) {
        return res
          .status(400)
          .json({ error: { message: "Email already exists" } });
      } else {
        const salt = genSaltSync(10);
        const text = randomString(8, true);
        logger.info("🚀 PASSWORD --->", { text });
        const credentials = {
          email: input.email,
          password: text,
          name: input?.firstName + " " + input?.lastName,
          //@ts-ignore
          businessName: user?.businessDetailsId?.businessName,
        };
        sendEmailToInvitedUser(input.email, credentials);
        const hashPassword = hashSync(text, salt);
        //@ts-ignore
        const allInvites = await User.findOne({ invitedById: _req?.user?.id })
          .sort({ rowIndex: -1 })
          .limit(1);
        const dataToSave = {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: hashPassword,
          role: RolesEnum.INVITED,
          //@ts-ignore
          invitedById: _req.user._id,
          businessDetailsId: user?.businessDetailsId,
          userLeadsDetailsId: user?.userLeadsDetailsId,
          accountManager: user?.accountManager,
          userServiceId: user?.userServiceId,
          businessIndustryId: user?.businessIndustryId,
          isActive: true,
          isVerified: true,
          //@ts-ignore
          rowIndex: allInvites?.rowIndex + 1 || 0,
          credits: user?.credits,
          leadCost: user?.leadCost,
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

  static show = async (_req: any, res: Response) => {
    const user = _req.user?._id;

    const perPage =
      _req.query.perPage && _req?.query?.perPage > 0
        ? parseInt(_req.query.perPage)
        : LIMIT;

    let skip =
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;
    let dataToFind: any = {
      invitedById: user,
      role: RolesEnum.INVITED,
      isDeleted: false,
    };
    if (_req.query.search) {
      dataToFind = {
        ...dataToFind,
        $or: [
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
        .populate("invitedById")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage);

      return res.json({ data: invitedUsers });
      // }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static delete = async (_req: any, res: Response) => {
    const id = _req.params.id;
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

  static update = async (_req: Request, res: Response) => {
    let curentUser: Partial<UserInterface> = _req.user ?? ({} as UserInterface);
    const id = _req.params.id;
    const user = curentUser?.id;
    const input = _req.body;
    try {
      const invitedUsers = await User.find({
        invitedById: user,
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

  static addSubscribers = async (_req: Request, res: Response) => {
    const input = _req.body;
    input.role = RolesEnum.SUBSCRIBER;
    input.isActive = true;
    try {
      const data = await User.find({
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
      if (data.length > 0) {
        return res
          .status(400)
          .json({ error: { message: "Email already exist" } });
      } else {
        const data = await User.create(input);
        return res.json({ data: data });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static deleteSubscriber = async (_req: Request, res: Response) => {
    const id = _req.params.id;

    try {
      const invitedUsers = await User.find({
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res
          .status(400)
          .json({ error: { message: "No Subscriber Found" } });
      } else {
        await User.findByIdAndUpdate(id, { isDeleted: true });
        return res.json({ data: { message: "Subscriber Deleted!" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static indexSubscriber = async (_req: any, res: Response) => {
    const perPage =
      _req.query && _req.query.perPage > 0
        ? parseInt(_req.query.perPage)
        : LIMIT;

    let skip =
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;
    let dataToFind: any = {
      isDeleted: false,
      role: RolesEnum.SUBSCRIBER,
    };
    if (_req.query.search) {
      dataToFind = {
        ...dataToFind,
        $or: [
          { email: { $regex: _req.query.search, $options: "i" } },
          { firstName: { $regex: _req.query.search, $options: "i" } },
          { lastName: { $regex: _req.query.search, $options: "i" } },
        ],
      };
      // skip = 0;
    }
    try {
      const invitedUsers = await User.find(dataToFind)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage);

      return res.json({ data: invitedUsers });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static addAdmins = async (_req: Request, res: Response) => {
    const input = _req.body;
    input.email = String(input.email).toLowerCase();

    input.isActive = true;

    try {
      if (input.role === RolesEnum.ADMIN) {
        input.role = RolesEnum.ADMIN;
        const data = await User.find({
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
              RolesEnum.ACCOUNT_ADMIN,

            ],
          },
        });
        if (data.length > 0) {
          return res
            .status(400)
            .json({ error: { message: "Email already exist" } });
        } else {
          const salt = genSaltSync(10);
          const text = randomString(8, true);
          const dataToSend = {
            name: `${input.firstName} ${input.lastName}`,
            password: text,
          };
          const hashPassword = hashSync(text, salt);
          logger.info("password", { text });
          input.password = hashPassword;
          sendEmailToInvitedAdmin(input.email, dataToSend);
          const permission = await Permissions.findOne({
            role: RolesEnum.ADMIN,
          });
          input.permissions = permission?.permissions;
          const data = await User.create(input);
          const adminExist: any = await User.findOne({
            role: RolesEnum.SUPER_ADMIN,
          });
          const adminPref: any = await LeadTablePreference.findOne({
            userId: adminExist.id,
          });
          const adminClientPref: any = await ClientTablePreference.findOne({
            userId: adminExist._id,
          });
          await LeadTablePreference.create({
            userId: data.id,
            columns: adminPref.columns,
          });
          await ClientTablePreference.create({
            columns: adminClientPref.columns,
            userId: data.id,
          });
          const show = await User.findById(data.id, "-password");

          return res.json({ data: show });
        }
      } else if (input.role === RolesEnum.ACCOUNT_MANAGER) {
        input.role = RolesEnum.ACCOUNT_MANAGER;
        const data = await User.find({
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
              RolesEnum.ACCOUNT_ADMIN,
            ],
          },
        });
        if (data.length > 0) {
          return res
            .status(400)
            .json({ error: { message: "Account Manager already exist" } });
        } else {
          const salt = genSaltSync(10);
          const text = randomString(8, true);
          const dataToSend = {
            name: input.firstName + " " + input.lastName,
            password: text,
          };
          const hashPassword = hashSync(text, salt);
          logger.info("password", { text });
          input.password = hashPassword;
          sendEmailToInvitedAccountManager(input.email, dataToSend);
          const permission = await Permissions.findOne({
            role: RolesEnum.ACCOUNT_MANAGER,
          });
          input.permissions = permission?.permissions;
          input.isActive = true;
          const data = await User.create(input);
          const adminExist: any = await User.findOne({
            role: RolesEnum.SUPER_ADMIN,
          });
          const adminPref: any = await LeadTablePreference.findOne({
            userId: adminExist.id,
          });
          const adminClientPref: any = await ClientTablePreference.findOne({
            userId: adminExist._id,
          });
          await LeadTablePreference.create({
            userId: data.id,
            columns: adminPref.columns,
          });
          await ClientTablePreference.create({
            columns: adminClientPref.columns,
            userId: data.id,
          });
          const show = await User.findById(data.id, "-password");

          
          return res.json({ data: show });
        }
      }
      else if (input.role === RolesEnum.ACCOUNT_ADMIN) {
          input.role = RolesEnum.ACCOUNT_ADMIN;
          input.isAccountAdmin = true;
          const data = await User.find({
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
                RolesEnum.ACCOUNT_ADMIN,
  
              ],
            },
          });
          if (data.length > 0) {
            return res
              .status(400)
              .json({ error: { message: "Email already exist" } });
          } else {
            const salt = genSaltSync(10);
            const text = randomString(8, true);
            const dataToSend = {
              name: `${input.firstName} ${input.lastName}`,
              password: text,
            };
            const hashPassword = hashSync(text, salt);
            logger.info("password", { text });
            input.password = hashPassword;
            sendEmailToInvitedAdmin(input.email, dataToSend);
            const permission = await Permissions.findOne({
              role: RolesEnum.ACCOUNT_ADMIN,
            });
            input.permissions = permission?.permissions;
            const data = await User.create(input);

            const show = await User.findById(data.id, "-password");

            return res.json({ data: show });
          }
        }
        return;
      
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static deleteAdmin = async (_req: Request, res: Response) => {
    const id = _req.params.id;

    try {
      const invitedUsers = await User.find({
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No Admin Found" } });
      } else {
        await User.findByIdAndUpdate(id, { isDeleted: true });
        return res.json({ data: { message: "Admin Deleted!" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static indexAdmin = async (_req: any, res: Response) => {
    const perPage =
      _req.query && _req.query.perPage > 0
        ? parseInt(_req.query.perPage)
        : LIMIT;

    let skip =
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;
    let dataToFind: any = {
      isDeleted: false,
      role: { $in: [RolesEnum.ADMIN, RolesEnum.ACCOUNT_MANAGER, RolesEnum.ACCOUNT_ADMIN]},
    };
    if (_req.query.search) {
      dataToFind = {
        ...dataToFind,
        $or: [
          { email: { $regex: _req.query.search, $options: "i" } },
          { firstName: { $regex: _req.query.search, $options: "i" } },
          { lastName: { $regex: _req.query.search, $options: "i" } },
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
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static updateAdmin = async (_req: Request, res: Response) => {
    const id = _req.params.id;
    const input = _req.body;
    try {
      const invitedUsers = await User.find({
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No Admin Found" } });
      } else {
        await User.findByIdAndUpdate(id, input, { new: true });
        const data = await User.findById(id, "-password");
        return res.json({ data: { message: "Admin Updated!", data: data } });
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
