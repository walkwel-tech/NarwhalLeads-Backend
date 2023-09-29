import { genSaltSync, hashSync } from "bcryptjs";
import { validate } from "class-validator";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { sort } from "../../utils/Enums/sorting.enum";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import { refreshToken } from "../../utils/XeroApiIntegration/createContact";
import { generatePDF } from "../../utils/XeroApiIntegration/generatePDF";
import { RegisterInput } from "../Inputs/Register.input";
import { sendEmailForUpdatedDetails } from "../Middlewares/mail";
import { BusinessDetails } from "../Models/BusinessDetails";
import { CardDetails } from "../Models/CardDetails";
import { Invoice } from "../Models/Invoice";
import { Transaction } from "../Models/Transaction";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import { ClientTablePreferenceInterface } from "../../types/clientTablePrefrenceInterface";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { Column } from "../../types/ColumnsPreferenceInterface";
import { deleteCustomerOnRyft } from "../../utils/createCustomer/deleteFromRyft";
import { MODEL_ENUM } from "../../utils/Enums/model.enum";
import { ACTION } from "../../utils/Enums/actionType.enum";
import { ActivityLogs } from "../Models/ActivityLogs";
import { findUpdatedFields } from "../../utils/Functions/findModifiedColumns";
import { Leads } from "../Models/Leads";
import { UserInterface } from "../../types/UserInterface";
import { leadsStatusEnums } from "../../utils/Enums/leads.status.enum";
import { PAYMENT_STATUS } from "../../utils/Enums/payment.status";
import { createSessionUnScheduledPayment } from "../../utils/payment/createPaymentToRYFT";
import { FILTER_FOR_CLIENT } from "../../utils/Enums/billableFilterEnum";
const ObjectId = mongoose.Types.ObjectId;

const LIMIT = 10;

interface DataObject {
  [key: string]: any;
}

export class UsersControllers {
  static create = async (req: Request, res: Response): Promise<Response> => {
    const input = req.body;
    const registerInput = new RegisterInput();

    registerInput.firstName = input.firstName;
    registerInput.lastName = input.lastName;
    registerInput.email = input.email;
    registerInput.password = input.password;

    const errors = await validate(registerInput);

    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      return res
        .status(400)
        .json({ error: { message: "VALIDATIONS_ERROR", info: errorsInfo } });
    }
    try {
      const user = await User.findOne({
        $or: [
          { email: input.email },
          { salesPhoneNumber: input.salesPhoneNumber },
        ],
      });
      if (!user) {
        const salt = genSaltSync(10);
        const hashPassword = hashSync(input.password, salt);
        let dataToSave: any = {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: hashPassword,
          role: RolesEnum.USER,
          salesPhoneNumber: input.salesPhoneNumber,
          country: input.country,
          address: input.address,
          city: input.city,
          postCode: input.postCode,
          companyName: input.companyName,
          companyUSPs: input.companyUSPs,
          isActive: true, //need to delete
          isVerified: true, //need to delete
        };

        const userData = await User.create(dataToSave);
        return res.json({
          data: {
            user: {
              _id: userData.id,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              role: userData.role,
            },
          },
        });
      } else {
        return res.status(400).json({
          data: {
            message: "User already exists with same email or phone number.",
          },
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static index = async (_req: any, res: Response): Promise<Response> => {
    try {
      let sortingOrder = _req.query.sortingOrder || sort.DESC;
      let filter = _req.query.clientType;
      let accountManagerBoolean = _req.query.accountManager;
      let accountManagerId = _req.query.accountManagerId;

      let sortKey = _req.query.sortKey || "createdAt";
      let isArchived = _req.query.isArchived || "false";
      let isActive = _req.query.isActive || "true";
      if (sortingOrder == sort.ASC) {
        sortingOrder = 1;
      } else {
        sortingOrder = -1;
      }
      if (isArchived === "undefined" || isArchived === "null") {
        isArchived = "false";
      }

      if (isActive === "undefined" || isActive === "null") {
        isActive = "true";
      }

      const perPage =
        _req.query && _req.query.perPage > 0
          ? parseInt(_req.query.perPage)
          : LIMIT;
      let skip =
        (_req.query && _req.query.page > 0
          ? parseInt(_req.query.page) - 1
          : 0) * perPage;

      let dataToFind: any = {
        role: {
          $nin: [
            RolesEnum.ADMIN,
            RolesEnum.INVITED,
            RolesEnum.SUPER_ADMIN,
            RolesEnum.ACCOUNT_MANAGER,
            RolesEnum.SUBSCRIBER,
          ],
        },
        // role:{$ne: RolesEnum.INVITED },
        isDeleted: false,
        isArchived: JSON.parse(isArchived?.toLowerCase()),
      };
      if (filter === FILTER_FOR_CLIENT.ALL) {
        dataToFind.role = { $in: [RolesEnum.NON_BILLABLE, RolesEnum.USER] };
      }
      if (filter === FILTER_FOR_CLIENT.BILLABLE) {
        dataToFind.role = { $in: [RolesEnum.USER] };
      }
      if (filter === FILTER_FOR_CLIENT.NON_BILLABLE) {
        dataToFind.role = { $in: [RolesEnum.NON_BILLABLE] };
      }
      if (accountManagerBoolean) {
        dataToFind.role = RolesEnum.ACCOUNT_MANAGER;
      }
      if (_req.query.isActive) {
        dataToFind.isActive = JSON.parse(isActive?.toLowerCase());
        dataToFind.isArchived = false;
      }
      if (_req.query.isArchived) {
        dataToFind.isArchived = JSON.parse(isArchived?.toLowerCase());
      }
      if (_req.query.industryId) {
        dataToFind.businessIndustryId = new ObjectId(_req.query.industryId);
      }
      if (accountManagerId != "" && accountManagerId) {
        dataToFind.accountManager = new ObjectId(_req.query.accountManagerId);
      }
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
            {
              "businessDetailsId.businessIndustry": {
                $regex: _req.query.search,
                $options: "i",
              },
            },
          ],
        };
        skip = 0;
      }
      let sortObject: Record<string, 1 | -1>;
      if (accountManagerBoolean) {
        sortObject = { firstName: 1 };
      } else {
        sortObject = {};
        sortObject[sortKey] = sortingOrder;
      }

      const [query]: any = await User.aggregate([
        {
          $facet: {
            results: [
              {
                $lookup: {
                  from: "businessdetails",
                  localField: "businessDetailsId",
                  foreignField: "_id",
                  as: "businessDetailsId",
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "accountManager",
                  foreignField: "_id",
                  as: "accountManager",
                },
              },
              {
                $unwind: "$accountManager",
              },
              {
                $lookup: {
                  from: "userleadsdetails",
                  localField: "userLeadsDetailsId",
                  foreignField: "_id",
                  as: "userLeadsDetailsId",
                },
              },
              {
                $lookup: {
                  from: "userservices",
                  localField: "userServiceId",
                  foreignField: "_id",
                  as: "userServiceId",
                },
              },
              { $match: dataToFind },

              //@ts-ignore
              { $sort: sortObject },
              {
                $project: {
                  verifiedAt: 0,
                  isVerified: 0,
                  // isActive: 0,
                  activatedAt: 0,
                  isDeleted: 0,
                  deletedAt: 0,
                  __v: 0,
                  isRyftCustomer: 0,
                  isLeadbyteCustomer: 0,
                  signUpFlowStatus: 0,
                  invitedById: 0,
                  // isArchived:0,
                  // createdAt: 0,
                  updatedAt: 0,
                  password: 0,
                  "businessDetailsId._id": 0,
                  "businessDetailsId.isDeleted": 0,
                  "businessDetailsId.deletedAt": 0,
                  "businessDetailsId.createdAt": 0,
                  "businessDetailsId.updatedAt": 0,
                  "businessDetailsId.__v": 0,
                  // "userLeadsDetailsId.postCodeTargettingList": 0,
                  "userLeadsDetailsId._id": 0,
                  "userLeadsDetailsId.isDeleted": 0,
                  "userLeadsDetailsId.deletedAt": 0,
                  "userLeadsDetailsId.createdAt": 0,
                  "userLeadsDetailsId.updatedAt": 0,
                  "userLeadsDetailsId.__v": 0,
                  "userLeadsDetailsId.userId": 0,
                },
              },
              {
                $addFields: {
                  createdAt: {
                    $dateToString: {
                      format: "%d/%m/%Y", // Define your desired format here
                      date: "$createdAt", // Replace "createdAt" with your actual field name
                    },
                  },
                },
              },
              { $skip: skip },
              { $limit: perPage },
              // { $sort: { firstName: 1 } },
            ],
            userCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      query.results.map((item: any) => {
        let businessDetailsId = Object.assign({}, item["businessDetailsId"][0]);
        let userLeadsDetailsId = Object.assign(
          {},
          item["userLeadsDetailsId"][0]
        );
        let userServiceId = Object.assign({}, item["userServiceId"][0]);

        item.userLeadsDetailsId = userLeadsDetailsId;
        item.businessDetailsId = businessDetailsId;
        item.userServiceId = userServiceId;
        item.businessDetailsId.daily = item.userLeadsDetailsId.daily;
        item.accountManager =
          item.accountManager.firstName + (item.accountManager.lastName || "");
      });

      const userCount = query.userCount[0]?.count || 0;
      const totalPages = Math.ceil(userCount / perPage);
      query.results.forEach((element: { password: any }) => {
        delete element.password;
      });
      return res.json({
        data: query.results,
        meta: {
          perPage: perPage,
          page: _req.query.page || 1,
          pages: totalPages,
          total: userCount,
        },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static show = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const business = req.query.business;
    let query;
    try {
      if (business) {
        const business = await BusinessDetails.findById(id);
        const users = await User.findOne({ businessDetailsId: business?.id });
        [query] = await User.aggregate([
          {
            $facet: {
              results: [
                {
                  $lookup: {
                    from: "businessdetails",
                    localField: "businessDetailsId",
                    foreignField: "_id",
                    as: "businessDetailsId",
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    localField: "accountManager",
                    foreignField: "_id",
                    as: "accountManager",
                  },
                },
                {
                  $unwind: "$accountManager",
                },
                {
                  $lookup: {
                    from: "userleadsdetails",
                    localField: "userLeadsDetailsId",
                    foreignField: "_id",
                    as: "userLeadsDetailsId",
                  },
                },
                {
                  $lookup: {
                    from: "carddetails",
                    localField: "_id",
                    foreignField: "userId",
                    as: "cardDetailsId",
                  },
                },
                { $match: { _id: new ObjectId(users?.id) } },
              ],
            },
          },
        ]);
        query.results.map((item: any) => {
          delete item.password;
          let businessDetailsId = Object.assign(
            {},
            item["businessDetailsId"][0]
          );
          let cardDetailsId = Object.assign({}, item["cardDetailsId"][0]);
          let userLeadsDetailsId = Object.assign(
            {},
            item["userLeadsDetailsId"][0]
          );
          item.userLeadsDetailsId = userLeadsDetailsId;
          item.businessDetailsId = businessDetailsId;
          item.cardDetailsId = cardDetailsId;
          item.accountManager =
            item.accountManager.firstName +
            (item.accountManager.lastName || "");
        });

        return res.json({ data: query.results[0] });
      } else {
        [query] = await User.aggregate([
          {
            $facet: {
              results: [
                {
                  $lookup: {
                    from: "businessdetails",
                    localField: "businessDetailsId",
                    foreignField: "_id",
                    as: "businessDetailsId",
                  },
                },
                {
                  $lookup: {
                    from: "userleadsdetails",
                    localField: "userLeadsDetailsId",
                    foreignField: "_id",
                    as: "userLeadsDetailsId",
                  },
                },
                {
                  $lookup: {
                    from: "carddetails",
                    localField: "_id",
                    foreignField: "userId",
                    as: "cardDetailsId",
                  },
                },
                { $match: { _id: new ObjectId(id) } },
              ],
            },
          },
        ]);
        query.results.map((item: any) => {
          delete item.password;
          let businessDetailsId = Object.assign(
            {},
            item["businessDetailsId"][0]
          );
          let cardDetailsId = Object.assign({}, item["cardDetailsId"][0]);
          let userLeadsDetailsId = Object.assign(
            {},
            item["userLeadsDetailsId"][0]
          );
          item.userLeadsDetailsId = userLeadsDetailsId;
          item.businessDetailsId = businessDetailsId;
          item.cardDetailsId = cardDetailsId;
        });

        return res.json({ data: query.results[0] });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static indexName = async (req: Request, res: Response): Promise<Response> => {
    try {
      const business = await User.aggregate(
        [
          { $match: { isDeleted: false, role: RolesEnum.USER } },
          {
            $lookup: {
              from: "businessdetails",
              localField: "businessDetailsId",
              foreignField: "_id",
              as: "businessInfo",
            },
          },
          {
            $unwind: "$businessInfo",
          },
          {
            $project: {
              "businessInfo._id": 1,
              "businessInfo.businessName": 1,
              _id: 0,
            },
          },
          { $sort: { "businessInfo.businessName": 1 } },
        ],
        {
          collation: {
            locale: "en", // Specify the locale for collation rules
          },
        }
      );
      if (business) {
        const reformattedObjects = business.map((item) => ({
          _id: item.businessInfo._id,
          businessName: item.businessInfo.businessName,
        }));
        return res.json({ data: reformattedObjects });
      } else {
        return res
          .status(404)
          .json({ error: { message: "Business not found." } });
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static update = async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const input = req.body;
    if (input.password) {
      // @ts-ignore
      delete input.password;
    }
    // @ts-ignore
    if (input.credits && req?.user.role == RolesEnum.USER) {
      // @ts-ignore
      delete input.credits;
    }

    if (
      // @ts-ignore
      req?.user.role === RolesEnum.USER &&
      (input.email || input.email == "")
    ) {
      // @ts-ignore
      input.email = req.user?.email;
    }

    try {
      const checkUser = await User.findById(id);
      const businesBeforeUpdate = await BusinessDetails.findById(
        checkUser?.businessDetailsId
      );
      // const userLeadDetailsBeforeUpdate=await UserLeadsDetails.findById(checkUser?.userLeadsDetailsId)
      const userForActivity = await User.findById(
        id,
        " -_id -businessDetailsId -businessIndustryId -userLeadsDetailsId -onBoarding -createdAt -updatedAt"
      ).lean();
      if (
        input.paymentMethod === paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
        // checkUser?.paymentMethod == paymentMethodEnum.WEEKLY_PAYMENT_METHOD
        //@ts-ignore
        req.user?.role === RolesEnum.USER
      ) {
        return res.status(403).json({
          error: {
            message:
              "Please contact admin to request for weekly payment method",
          },
        });
      }
      if (
        // @ts-ignore
        (input.buyerId ||
          input.leadCost ||
          input.ryftClientId ||
          input.xeroContactId ||
          input.role) &&
        //@ts-ignore
        req.user?.role == RolesEnum.USER
      ) {
        return res
          .status(403)
          .json({ error: { message: "Please contact admin to update." } });
      }
      if (
        input.paymentMethod &&
        // @ts-ignore
        checkUser?.paymentMethod == paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
        // @ts-ignore
        req.user?.role === RolesEnum.USER
      ) {
        return res.status(403).json({
          error: { message: "Please contact admin to change payment method" },
        });
      }
      if (input.smsPhoneNumber) {
        const userExist = await User.findOne({
          smsPhoneNumber: input.smsPhoneNumber,
        });

        if (
          userExist &&
          // @ts-ignore
          userExist.id !== req?.user?.id &&
          userExist.role !== RolesEnum.SUPER_ADMIN
        ) {
          return res.status(400).json({
            error: {
              message:
                "This Number is already registered with another account.",
            },
          });
        }
      }
      if (!checkUser) {
        return res
          .status(404)
          .json({ error: { message: "User to update does not exists." } });
      }

      const cardExist = await CardDetails.findOne({
        userId: checkUser?._id,
        isDefault: true,
      });

      if (
        !cardExist &&
        input.credits &&
        //@ts-ignore
        (req?.user.role == RolesEnum.USER ||
          //@ts-ignore
          req?.user.role == RolesEnum.ADMIN ||
          //@ts-ignore
          req?.user.role == RolesEnum.SUPER_ADMIN)
      ) {
        return res
          .status(404)
          .json({ error: { message: "Card Details not found!" } });
      }
      if (input.businessName) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        const businesses = await BusinessDetails.find({
          businessName: input.businessName,
        });
        if (businesses.length > 0) {
          let array: mongoose.Types.ObjectId[] = [];
          businesses.map((business) => {
            array.push(business._id);
          });
          const businessDetailsIdInString =
            checkUser?.businessDetailsId.toString();

          const ids = array.some(
            (item) => item.toString() === businessDetailsIdInString
          );

          if (!ids) {
            return res
              .status(400)
              .json({ error: { message: "Business Name Already Exists." } });
          }
        }

        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessName: input.businessName },

          { new: true }
        );
      }
      if (input.businessAddress) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }

        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessAddress: input.businessAddress },

          { new: true }
        );
      }
      if (input.businessSalesNumber) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }

        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessSalesNumber: input.businessSalesNumber },

          { new: true }
        );
      }
      if (input.businessCity) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessCity: input.businessCity },

          { new: true }
        );
      }
      if (input.businessCountry) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessCountry: input.businessCountry },

          { new: true }
        );
      }
      if (input.businessPostCode) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessPostCode: input.businessPostCode },

          { new: true }
        );
      }
      if (input.businessIndustry) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessIndustry: input.businessIndustry },

          { new: true }
        );
      }
      if (input.businessOpeningHours) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessOpeningHours: input.businessOpeningHours },

          { new: true }
        );
      }
      if (input.total) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { total: input.total },

          { new: true }
        );
      }
      if (input.weekly) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { weekly: input.weekly },

          { new: true }
        );
      }
      if (input.monthly) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { monthly: input.monthly },

          { new: true }
        );
      }
      if (input.leadSchedule) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { leadSchedule: input.leadSchedule },

          { new: true }
        );
      }
      if (input.postCodeTargettingList) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { postCodeTargettingList: input.postCodeTargettingList },

          { new: true }
        );
      }
      if (input.leadAlertsFrequency) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { leadAlertsFrequency: input.leadAlertsFrequency },

          { new: true }
        );
      }
      if (input.zapierUrl) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { zapierUrl: input.zapierUrl, sendDataToZapier: true },

          { new: true }
        );
      }
      if (input.daily) {
        if (!checkUser.userLeadsDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "lead details not found" } });
        }
        input.daily = parseInt(input.daily);
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { daily: input.daily },

          { new: true }
        );
      }
      if (
        input.credits &&
        // @ts-ignore
        (req?.user.role == RolesEnum.ADMIN ||
          // @ts-ignore
          req?.user.role == RolesEnum.SUPER_ADMIN)
      ) {
        const params: any = {
          fixedAmount: input.credits,
          email: checkUser?.email,
          cardNumber: cardExist?.cardNumber,
          buyerId: checkUser?.buyerId,
          clientId: checkUser.ryftClientId,
          cardId: cardExist?.id,
        };

        createSessionUnScheduledPayment(params)
          .then(async (_res: any) => {
            if (!checkUser.xeroContactId) {
              console.log("xeroContact ID not found. Failed to generate pdf.");
            }
            const dataToSave: any = {
              userId: checkUser?.id,
              cardId: cardExist?.id,
              amount: input.credits,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "success",
              creditsLeft: checkUser?.credits + input.credits,
            };

            const transaction = await Transaction.create(dataToSave);
            if (checkUser?.xeroContactId) {
              generatePDF(
                checkUser?.xeroContactId,
                transactionTitle.CREDITS_ADDED,
                //@ts-ignore
                input?.credits,
                0,
                _res.data.id
              )
                .then(async (res: any) => {
                  const dataToSaveInInvoice: any = {
                    userId: checkUser?.id,
                    transactionId: transaction.id,
                    price: input.credits,
                    invoiceId: res.data.Invoices[0].InvoiceID,
                  };
                  await Invoice.create(dataToSaveInInvoice);
                  await Transaction.findByIdAndUpdate(transaction.id, {
                    invoiceId: res.data.Invoices[0].InvoiceID,
                  });

                  console.log("pdf generated");
                })
                .catch(async (err) => {
                  refreshToken().then(async (res) => {
                    generatePDF(
                      checkUser?.xeroContactId,
                      transactionTitle.CREDITS_ADDED,
                      //@ts-ignore
                      input.credits,
                      0,
                      _res.data.id
                    ).then(async (res: any) => {
                      const dataToSaveInInvoice: any = {
                        userId: checkUser?.id,
                        transactionId: transaction.id,
                        price: input.credits,
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      };
                      await Invoice.create(dataToSaveInInvoice);
                      await Transaction.findByIdAndUpdate(transaction.id, {
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      });

                      console.log("pdf generated");
                    });
                  });
                });
            }

            console.log("payment success!!!!!!!!!!!!!");

            await User.findByIdAndUpdate(
              id,
              {
                ...input,
                credits: checkUser.credits + input.credits,
              },
              {
                new: true,
              }
            );
          })
          .catch(async (err) => {
            // sendEmailForFailedAutocharge(i.email, subject, text);
            const dataToSave: any = {
              userId: checkUser?.id,
              cardId: cardExist?.id,
              amount: input.credits,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "error",
              creditsLeft: checkUser?.credits,
            };
            await Transaction.create(dataToSave);
            console.log("error in payment Api", err);
          });
      } else {
        const user = await User.findByIdAndUpdate(
          id,
          {
            ...input,
          },
          {
            new: true,
          }
        );

        if (!user) {
          return res
            .status(404)
            .json({ error: { message: "User to update does not exists." } });
        }
        const result = await User.findById(id, "-password -__v");
        const buinessData = await BusinessDetails.findById(
          result?.businessDetailsId
        );
        const leadData = await UserLeadsDetails.findById(
          result?.userLeadsDetailsId
        );
        const formattedPostCodes = leadData?.postCodeTargettingList
          .map((item: any) => item.postalCode)
          .flat();
        const userAfterMod = await User.findById(
          id,
          " -_id -businessDetailsId -businessIndustryId -userLeadsDetailsId -onBoarding -createdAt -updatedAt"
        ).lean();
        const message = {
          firstName: result?.firstName,
          lastName: result?.lastName,
          businessName: buinessData?.businessName,
          phone: buinessData?.businessSalesNumber,
          email: result?.email,
          industry: buinessData?.businessIndustry,
          address: buinessData?.address1 + " " + buinessData?.address2,
          city: buinessData?.businessCity,
          country: buinessData?.businessCountry,
          openingHours: buinessData?.businessOpeningHours,
          logo: buinessData?.businessLogo,
          // openingHours:formattedOpeningHours,
          totalLeads: leadData?.total,
          monthlyLeads: leadData?.monthly,
          weeklyLeads: leadData?.weekly,
          dailyLeads: leadData?.daily,
          // leadsHours:formattedLeadSchedule,
          leadsHours: leadData?.leadSchedule,
          area: `${formattedPostCodes}`,
          leadCost: user?.leadCost,
        };
        sendEmailForUpdatedDetails(message);

        const fields = findUpdatedFields(userForActivity, userAfterMod);
        const isEmpty = Object.keys(fields.updatedFields).length === 0;

        if (!isEmpty && user?.isSignUpCompleteWithCredit) {
          const activity = {
            //@ts-ignore
            actionBy: req?.user?.role,
            actionType: ACTION.UPDATING,
            targetModel: MODEL_ENUM.USER,
            userEntity: req.params.id,
            originalValues: fields.oldFields,
            modifiedValues: fields.updatedFields,
          };
          await ActivityLogs.create(activity);
        }

        if (input.triggerAmount || input.autoChargeAmount) {
          return res.json({
            message: "Auto Top-Up Settings Updated Successfully",
            data: result,
          });
        }
        if (input.isSmsNotificationActive || input.smsPhoneNumber) {
          return res.json({
            message: "SMS Settings Saved Successfully",
            data: result,
          });
        } else if (input.paymentMethod) {
          return res.json({
            message: "Payment Mode Changed Successfully",
            data: result,
          });
        } else {
          if (
            input.businessIndustry ||
            input.businessName ||
            input.businessLogo ||
            input.address1 ||
            input.address2 ||
            input.businessSalesNumber ||
            input.businessCountry ||
            input.businessPostCode ||
            input.businessOpeningHours
          ) {
            const businesAfterUpdate = await BusinessDetails.findById(
              checkUser.businessDetailsId,
              " -_id  -createdAt -updatedAt"
            ).lean();

            const fields = findUpdatedFields(
              businesBeforeUpdate,
              businesAfterUpdate
            );
            const isEmpty = Object.keys(fields.updatedFields).length === 0;
            if (!isEmpty && user?.isSignUpCompleteWithCredit) {
              const activity = {
                //@ts-ignore
                actionBy: req?.user?.role,
                actionType: ACTION.UPDATING,
                targetModel: MODEL_ENUM.BUSINESS_DETAILS,
                //@ts-ignore
                userEntity: checkUser?.id,
                originalValues: fields.oldFields,
                modifiedValues: fields.updatedFields,
              };
              await ActivityLogs.create(activity);
            }
          }
          return res.json({ message: "Updated Successfully", data: result });
        }
      }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };

  static destroy = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const userExist = await User.findById(id);
    if (userExist?.isDeleted) {
      return res
        .status(400)
        .json({ error: { message: "User has been already deleted." } });
    }

    try {
      const user = await User.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
      });
      await BusinessDetails.findByIdAndDelete(userExist?.businessDetailsId);
      await UserLeadsDetails.findByIdAndDelete(userExist?.userLeadsDetailsId);
      await CardDetails.deleteMany({ userId: userExist?.id });

      //@ts-ignore
      deleteCustomerOnRyft(user?.ryftClientId)
        .then(() => console.log("deleted customer"))
        .catch(() => console.log("error while deleting customer on ryft"));

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

  static reOrderIndex = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    try {
      input.forEach(async (key: { _id: any; rowIndex: any }) => {
        await User.findByIdAndUpdate(
          { _id: key._id },
          { rowIndex: key.rowIndex },
          { new: true }
        );
      });
      return res.json({ data: { message: "user list re-ordered!" } });
    } catch {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static invoices = async (req: Request, res: Response): Promise<any> => {
    const user = req.user;
    try {
      //@ts-ignore
      const invoices = await Invoice.find({ userId: user.id });
      return res.json({ data: invoices });
    } catch {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showAllClientsForAdminExportFile = async (
    _req: any,
    res: Response
  ) => {
    const id = _req.query.id;
    const status = _req.query.status;
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
    try {
      let dataToFind: any = {
        role: {
          $nin: [RolesEnum.ADMIN, RolesEnum.INVITED, RolesEnum.SUPER_ADMIN],
        },
        isDeleted: false,
      };
      if (_req.query.invited) {
        dataToFind.role = { $nin: [RolesEnum.ADMIN] };
      }
      if (_req.query.isActive) {
        dataToFind.isActive = true;
        dataToFind.isArchived = false;
      }

      if (_req.query.isInActive) {
        dataToFind.isActive = false;
        dataToFind.isArchived = false;
      }

      if (_req.query.isArchived) {
        dataToFind.isArchived = true;
      }
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
        };
      }
      if (status) {
        dataToFind.status = status;
      }
      if (id) {
        dataToFind._id = new ObjectId(id);
      }
      const [query]: any = await User.aggregate([
        {
          $facet: {
            results: [
              {
                $lookup: {
                  from: "businessdetails",
                  localField: "businessDetailsId",
                  foreignField: "_id",
                  as: "businessDetailsId",
                },
              },
              {
                $lookup: {
                  from: "userleadsdetails",
                  localField: "userLeadsDetailsId",
                  foreignField: "_id",
                  as: "userLeadsDetailsId",
                },
              },
              { $match: dataToFind },
              { $sort: { createdAt: sortingOrder } },
              {
                $project: {
                  rowIndex: 0,
                  __v: 0,
                  updatedAt: 0,
                  password: 0,
                  onBoarding: 0,
                  "businessDetailsId.businessOpeningHours": 0,
                  "businessDetailsId.__v": 0,
                  "businessDetailsId._id": 0,
                  "businessDetailsId.updatedAt": 0,
                  "userLeadsDetailsId.__v": 0,
                  "userLeadsDetailsId._id": 0,
                  "userLeadsDetailsId.updatedAt": 0,
                  "userLeadsDetailsId.leadSchedule": 0,
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      query.results.map((item: any) => {
        let businessDetailsId = Object.assign({}, item["businessDetailsId"][0]);
        let userLeadsDetailsId = Object.assign(
          {},
          item["userLeadsDetailsId"][0]
        );
        item.userLeadsDetailsId = userLeadsDetailsId;
        item.businessDetailsId = businessDetailsId;
      });
      const pref: ClientTablePreferenceInterface | null =
        await ClientTablePreference.findOne({ userId: _req.user.id });

      const filteredDataArray: DataObject[] = filterAndTransformData(
        //@ts-ignore
        pref?.columns,
        convertArray(query.results)
      );
      const arr = filteredDataArray;
      return res.json({
        data: arr,
      });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static createAccountManager = async (req: any, res: Response) => {
    try {
      const input = req.body;
      let data;
      const exists = await User.findOne({
        firstName: input.firstName,
        lastName: input.lastName,
        role: RolesEnum.ACCOUNT_MANAGER,
        isDeleted: false,
      });
      if (exists) {
        return res
          .status(400)
          .json({ message: "Account Manager already exists" });
      } else {
        const dataToSave = {
          firstName: input.firstName,
          lastName: input.lastName,
          role: RolesEnum.ACCOUNT_MANAGER,
        };
        data = await User.create(dataToSave);
      }
      return res.json({ data: data });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static accountManagerStats = async (req: any, res: Response) => {
    try {
      const input = req.body;
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const year: any = new Date().getFullYear();
      const difference: number = endDate.getTime() - startDate.getTime();
      const differenceMs: number = Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );

      console.log(differenceMs);
      let days = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ];
      const labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      let accountManagersId = input.accountManagerIds;
      let userObj: Object[] = [];
      let rawDataInDaysForRejectedLeads;
      let rawDataInDaysForRequestedLeads;
      await Promise.all(
        accountManagersId.map(async (id: string) => {
          let bids: string[] = [];
          let credits: number[] = [];
          let txn: number[] = [];
          let leadsRequested;
          let leadRejected;
          const manager = await User.findById(id);
          if (manager) {
            const res = await User.find({
              accountManager: id,
              createdAt: { $gte: startDate, $lte: endDate },
            }).populate("accountManager");
            let obj: Record<string, string | number> = {};
            //@ts-ignore
            obj.name = manager?.firstName;

            res.forEach(async (user: UserInterface) => {
              if (user.buyerId) bids.push(user.buyerId);
              credits.push(user.credits);
              let txns = await Transaction.find({
                userId: user?.id,

                title: transactionTitle.CREDITS_ADDED,

                status: PAYMENT_STATUS.CAPTURED,

                createdAt: { $gte: startDate, $lte: endDate },
              });
              if (txns) txn.push(txns.length);
            });
            if (differenceMs < 30) {
              leadRejected = await Leads.find({
                bid: { $in: bids },
                status: leadsStatusEnums.REPORT_REJECTED,
                createdAt: { $gte: startDate, $lte: endDate },
              });

              leadsRequested = await Leads.aggregate([
                {
                  $match: {
                    bid: { $in: bids },
                    status: leadsStatusEnums.VALID,
                    createdAt: {
                      $gte: startDate,
                      $lt: endDate,
                    },
                  },
                },
                {
                  $addFields: {
                    dayOfMonth: { $dayOfMonth: "$createdAt" },
                  },
                },
                {
                  $group: {
                    _id: {
                      dayOfMonth: "$dayOfMonth",
                      year: { $year: "$createdAt" },
                    },
                    count: { $sum: 1 },
                  },
                },

                {
                  $project: {
                    _id: 0,
                    dayOfMonth: "$_id.dayOfMonth",
                    year: "$_id.year",
                    count: 1,
                  },
                },
                {
                  $sort: {
                    dayOfMonth: 1,
                  },
                },
              ]);
              (rawDataInDaysForRejectedLeads = leadRejected.length),
                (rawDataInDaysForRequestedLeads = convertDataForDaysInMonth(
                  leadsRequested,
                  days,
                  year
                ));
            } else {
              leadRejected = await Leads.find({
                bid: { $in: bids },
                status: leadsStatusEnums.REPORT_REJECTED,
                createdAt: { $gte: startDate, $lte: endDate },
              });
              leadsRequested = await Leads.aggregate([
                {
                  $match: {
                    bid: { $in: bids },
                    status: leadsStatusEnums.VALID,
                    createdAt: {
                      $gte: startDate,
                      $lt: endDate,
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      year: { $year: "$createdAt" },

                      month: { $month: "$createdAt" },
                    },
                    count: { $sum: 1 },
                  },
                },
                {
                  $addFields: {
                    monthName: {
                      $let: {
                        vars: {
                          monthsInString: [
                            null,
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ],
                        },
                        in: {
                          $arrayElemAt: ["$$monthsInString", "$_id.month"],
                        },
                      },
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    monthName: 1,
                    count: 1,
                  },
                },
                {
                  $sort: {
                    year: 1,
                    month: 1,
                  },
                },
              ]);
              rawDataInDaysForRejectedLeads = leadRejected.length;
              rawDataInDaysForRequestedLeads = convertData(
                leadsRequested,
                labels,
                year
              );
            }

            //@ts-ignore
            obj.leadsRejectedCount = rawDataInDaysForRejectedLeads;
            //@ts-ignore
            obj.leadsRequestedCount = rawDataInDaysForRequestedLeads;
            let creditsTotal;
            if (credits.length > 0) {
              creditsTotal = credits.reduce((acc, cor) => {
                return acc + cor;
              });
            } else {
              creditsTotal = 0;
            }

            let txnTotal;
            if (txn && txn.length > 0) {
              txnTotal = txn.reduce((acc, cor) => {
                return acc + cor;
              });
            } else {
              txnTotal = 0;
            }

            obj.creditsSum = creditsTotal;
            // console.log("txnTotal", txnTotal);
            if (txnTotal > 0) {
              obj.creditsCount = txnTotal;
              obj.creditsAvg = Math.ceil(creditsTotal / txnTotal);
            } else {
              obj.creditsCount = 0;
              obj.creditsAvg = creditsTotal;
            }

            userObj.push(obj);
          }
        })
      );
      return res.json({ data: userObj });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static accountManagerStatsNew = async (req: any, res: Response) => {
    try {
      const input = req.body;
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const year: any = new Date().getFullYear();
      const differenceMs: number = endDate.getTime() - startDate.getTime();
      let days = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
      ];
      const labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      let accountManagersId = input.accountManagerIds;
      let userObj: Object[] = [];
      let rawDataInDaysForRejectedLeads;
      let rawDataInDaysForRequestedLeads;
      await Promise.all(
        accountManagersId.map(async (id: string) => {
          let bids: string[] = [];
          let credits: number[] = [];
          let txn: number[] = [];
          let leadsRequested;
          let leadRejected;
          const manager = await User.findById(id);
          const res = await User.find({
            accountManager: id,
            createdAt: { $gte: startDate, $lte: endDate },
          }).populate("accountManager");
          let obj: Record<string, string | number> = {};
          //@ts-ignore
          obj.name = manager?.firstName;

          res.forEach(async (user: UserInterface) => {
            if (user.buyerId) bids.push(user.buyerId);
            credits.push(user.credits);
            let txns = await Transaction.find({
              userId: user?.id,

              title: transactionTitle.CREDITS_ADDED,

              status: PAYMENT_STATUS.CAPTURED,

              createdAt: { $gte: startDate, $lte: endDate },
            });
            if (txns) txn.push(txns.length);
          });
          if (differenceMs < 30) {
            leadsRequested = await Leads.aggregate([
              {
                $match: {
                  bid: { $in: bids },
                  status: leadsStatusEnums.VALID,
                  createdAt: {
                    $gte: startDate,
                    $lt: endDate,
                  },
                },
              },
              {
                $addFields: {
                  dayOfMonth: { $dayOfMonth: "$createdAt" },
                },
              },
              {
                $group: {
                  _id: {
                    dayOfMonth: "$dayOfMonth",
                    // dayOfWeek: "$dayOfWeek",
                    year: { $year: "$createdAt" },
                    // month: { $month: "$createdAt" },
                  },
                  count: { $sum: 1 },
                },
              },

              {
                $project: {
                  _id: 0,
                  dayOfMonth: "$_id.dayOfMonth",

                  year: "$_id.year",
                  // month: "$_id.month",
                  // monthName: 1,
                  count: 1,
                },
              },
              {
                $sort: {
                  dayOfMonth: 1,
                  // year:1
                },
              },
            ]);
            leadRejected = await Leads.aggregate([
              {
                $match: {
                  bid: { $in: bids },
                  status: leadsStatusEnums.VALID,
                  createdAt: {
                    $gte: startDate,
                    $lt: endDate,
                  },
                },
              },
              {
                $addFields: {
                  dayOfMonth: { $dayOfMonth: "$createdAt" },
                },
              },
              {
                $group: {
                  _id: {
                    dayOfMonth: "$dayOfMonth",
                    // dayOfWeek: "$dayOfWeek",
                    year: { $year: "$createdAt" },
                    // month: { $month: "$createdAt" },
                  },
                  count: { $sum: 1 },
                },
              },

              {
                $project: {
                  _id: 0,
                  dayOfMonth: "$_id.dayOfMonth",

                  year: "$_id.year",
                  // month: "$_id.month",
                  // monthName: 1,
                  count: 1,
                },
              },
              {
                $sort: {
                  dayOfMonth: 1,
                  // year:1
                },
              },
            ]);
            rawDataInDaysForRequestedLeads = convertDataForDaysInMonth(
              leadsRequested,
              days,
              year
            );
            rawDataInDaysForRejectedLeads = convertDataForDaysInMonth(
              leadRejected,
              days,
              year
            );
            // let rawDataInMonth = convertData(leadRejected, labels, year);
          } else {
            leadsRequested = await Leads.aggregate([
              {
                $match: {
                  bid: { $in: bids },
                  status: leadsStatusEnums.VALID,
                  createdAt: {
                    $gte: startDate,
                    $lt: endDate,
                  },
                },
              },
              {
                $group: {
                  _id: {
                    year: { $year: "$createdAt" },

                    month: { $month: "$createdAt" },
                  },
                  count: { $sum: 1 },
                },
              },
              {
                $addFields: {
                  monthName: {
                    $let: {
                      vars: {
                        monthsInString: [
                          null,
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "May",
                          "Jun",
                          "Jul",
                          "Aug",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Dec",
                        ],
                      },
                      in: {
                        $arrayElemAt: ["$$monthsInString", "$_id.month"],
                      },
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  year: "$_id.year",
                  month: "$_id.month",
                  monthName: 1,
                  count: 1,
                },
              },
              {
                $sort: {
                  year: 1,
                  month: 1,
                },
              },
            ]);
            leadRejected = await Leads.aggregate([
              {
                $match: {
                  bid: { $in: bids },
                  status: leadsStatusEnums.REPORT_REJECTED,
                  createdAt: {
                    $gte: startDate,
                    $lt: endDate,
                  },
                },
              },
              {
                $group: {
                  _id: {
                    year: { $year: "$createdAt" },

                    month: { $month: "$createdAt" },
                  },
                  count: { $sum: 1 },
                },
              },
              {
                $addFields: {
                  monthName: {
                    $let: {
                      vars: {
                        monthsInString: [
                          null,
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "May",
                          "Jun",
                          "Jul",
                          "Aug",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Dec",
                        ],
                      },
                      in: {
                        $arrayElemAt: ["$$monthsInString", "$_id.month"],
                      },
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  year: "$_id.year",
                  month: "$_id.month",
                  monthName: 1,
                  count: 1,
                },
              },
              {
                $sort: {
                  year: 1,
                  month: 1,
                },
              },
            ]);
            rawDataInDaysForRequestedLeads = convertData(
              leadsRequested,
              labels,
              year
            );
            rawDataInDaysForRejectedLeads = convertData(
              leadRejected,
              labels,
              year
            );
          }
          // const leadsRejected = await Leads.find({
          //   bid: { $in: bids },

          //   status: leadsStatusEnums.REPORT_REJECTED,
          //   createdAt: { $gte: startDate, $lte: endDate },
          // });

          //@ts-ignore
          obj.leadsRejectedCount = rawDataInDaysForRequestedLeads;
          //@ts-ignore
          obj.leadsRequestedCount = rawDataInDaysForRejectedLeads;
          let creditsTotal;
          if (credits.length > 0) {
            creditsTotal = credits.reduce((acc, cor) => {
              return acc + cor;
            });
          } else {
            creditsTotal = 0;
          }

          let txnTotal;
          if (txn && txn.length > 0) {
            txnTotal = txn.reduce((acc, cor) => {
              return acc + cor;
            });
          } else {
            txnTotal = 0;
          }

          obj.creditsSum = creditsTotal;
          // console.log("txnTotal", txnTotal);
          if (txnTotal > 0) {
            obj.creditsCount = txnTotal;
            obj.creditsAvg = creditsTotal / txnTotal;
          } else {
            obj.creditsCount = 0;
            obj.creditsAvg = creditsTotal;
          }

          userObj.push(obj);
        })
      );
      return res.json({ data: userObj });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };
}

function convertArray(arr: any) {
  return arr.map((obj: any) => {
    const keys = Object.keys(obj);
    const newObj = {};
    keys.forEach((key) => {
      if (typeof obj[key] === "object") {
        if (obj[key] == null) {
          obj[key] == "null";
        } else {
          const subKeys = Object.keys(obj[key]);
          subKeys.forEach((subKey) => {
            //@ts-ignore
            newObj[subKey] = obj[key][subKey];
          });
        }
      } else {
        //@ts-ignore
        newObj[key] = obj[key];
      }
    });
    return newObj;
  });
}

function filterAndTransformData(
  columns: Column[],
  dataArray: DataObject[]
): DataObject[] {
  return dataArray.map((dataObj: DataObject) => {
    const filteredData: DataObject = {};

    columns.forEach((column: Column) => {
      if (column.isVisible && column.name in dataObj) {
        filteredData[column.newName || column.name] = dataObj[column.name];
      }
    });

    return filteredData;
  });
}

function convertData(data: any, labels: any, year: any) {
  // Initialize an array of 12 elements with all zeros
  const dataArr = Array(12).fill(0);

  // Loop through each object in the data array and update the corresponding element in dataArr
  data.forEach((obj: any) => {
    const index = obj.month - 1;
    if (obj.year != year) {
    } else {
      dataArr[index] += obj.count;
    }
  });
  let years: any = [];
  data.map((i: any) => {
    if (!years.includes(i.year)) {
      years.push(i.year);
    }
  });

  // Create an object with labels and data properties
  return { labels, data: dataArr, years: years };
}

function convertDataForDaysInMonth(data: any, labels: any, year: any) {
  // Initialize an array of 12 elements with all zeros
  const dataArr = Array(31).fill(0);

  // Loop through each object in the data array and update the corresponding element in dataArr
  data.forEach((obj: any) => {
    const index = obj.dayOfMonth - 1;
    if (obj.year != year) {
    } else {
      dataArr[index] += obj.count;
    }
  });
  let years: any = [];
  data.map((i: any) => {
    if (!years.includes(i.year)) {
      years.push(i.year);
    }
  });

  // Create an object with labels and data properties
  return { labels, data: dataArr, years: years };
}
