import { genSaltSync, hashSync } from "bcryptjs";
import { validate } from "class-validator";
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { sort } from "../../utils/Enums/sorting.enum";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import { refreshToken } from "../../utils/XeroApiIntegration/createContact";
import {
  generatePDF,
  generatePDFParams,
} from "../../utils/XeroApiIntegration/generatePDF";
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
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { TransactionInterface } from "../../types/TransactionInterface";
import { InvoiceInterface } from "../../types/InvoiceInterface";
import { cmsUpdateBuyerWebhook } from "../../utils/webhookUrls/cmsUpdateBuyerWebhook";
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../utils/constantFiles/OnBoarding.keys";
import { CARD_DETAILS } from "../../utils/constantFiles/signupFields";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { sendLeadDataToZap } from "../../utils/webhookUrls/sendDataZap";

import {
  BusinessDetailsInterface,
  isBusinessObject,
} from "../../types/BusinessInterface";
import { UserLeadsDetailsInterface } from "../../types/LeadDetailsInterface";
import {
  PostcodeWebhookParams,
  eventsWebhook,
} from "../../utils/webhookUrls/eventExpansionWebhook";
import { EVENT_TITLE } from "../../utils/constantFiles/events";
import { flattenPostalCodes } from "../../utils/Functions/flattenPostcodes";
import {
  topUpUserForPaymentMethod,
  getUserPaymentMethods,
  getUsersWithAutoChargeEnabled,
} from "../AutoUpdateTasks/autoCharge";
import { AUTO_UPDATED_TASKS } from "../../utils/Enums/autoUpdatedTasks.enum";
import { AutoUpdatedTasksLogs } from "../Models/AutoChargeLogs";
import { POSTCODE_TYPE } from "../../utils/Enums/postcode.enum";
import { arraysAreEqual } from "../../utils/Functions/postCodeMatch";
import { PermissionInterface } from "../../types/PermissionsInterface";
import { Permissions } from "../Models/Permission";

const ObjectId = mongoose.Types.ObjectId;

const LIMIT = 10;

interface DataObject {
  [key: string]: any;
}
type RoleFilter = {
  $in: (RolesEnum.USER | RolesEnum.NON_BILLABLE)[];
};

type FindOptions = {
  isDeleted: boolean;
  role: RoleFilter;
  accountManager?: Types.ObjectId;
};

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
      let sortKey = _req.query.sortBy
        ? JSON.parse(_req.query.sortBy)[0]?.id || "createdAt"
        : "";
      let isArchived = _req.query.isArchived || "false";
      let isActive = _req.query.isActive || "true";
      if (sortingOrder === sort.ASC) {
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
            // RolesEnum.ACCOUNT_MANAGER,
            RolesEnum.SUBSCRIBER,
          ],
        },
        // role:{$ne: RolesEnum.INVITED },
        isDeleted: false,
        isArchived: JSON.parse(isArchived?.toLowerCase()),
      };
      if (filter === FILTER_FOR_CLIENT.ALL && !accountManagerBoolean) {
        dataToFind.role = { $in: [RolesEnum.NON_BILLABLE, RolesEnum.USER] };
      }
      if (filter === FILTER_FOR_CLIENT.BILLABLE && !accountManagerBoolean) {
        // dataToFind.role = { $in: [RolesEnum.USER] };
        dataToFind.isCreditsAndBillingEnabled = true;
      }
      if (filter === FILTER_FOR_CLIENT.NON_BILLABLE && !accountManagerBoolean) {
        // dataToFind.role = { $in: [RolesEnum.NON_BILLABLE] };
        dataToFind.isCreditsAndBillingEnabled = false;
      }
      // if (accountManagerBoolean) {
      //   dataToFind.role = { $in: [RolesEnum.ACCOUNT_MANAGER, RolesEnum.ACCOUNT_ADMIN] };
      //   dataToFind.isActive = true;
      // }
      if (accountManagerBoolean) {
        dataToFind.permissions = {
          $elemMatch: {
            module: "client_manage",
            permission: { $in: ["create", "read", "update", "delete"] },
          },
        };

        dataToFind.isActive = true;
      }
      if (
        accountManagerBoolean &&
        _req.user.role === RolesEnum.ACCOUNT_MANAGER
      ) {
        dataToFind._id = new ObjectId(_req.user._id);
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
      if (
        _req.user.role === RolesEnum.ACCOUNT_MANAGER &&
        !accountManagerBoolean
      ) {
        dataToFind.accountManager = new ObjectId(_req.user._id);
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
        // skip = 0;
      }
      let sortObject: Record<string, 1 | -1>;
      if (accountManagerBoolean) {
        sortObject = { firstName: 1 };
      } else {
        sortObject = {};
        sortObject[sortKey] = sortingOrder;
      }
      let pipeline = [
        {
          $facet: {
            results: [
              { $match: dataToFind },
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
              // {
              //   $unwind: "$accountManager",
              // },
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
              // { $skip: skip },
              // { $limit: perPage },
              // { $sort: { firstName: 1 } },
            ],
            userCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ];

      if (!accountManagerBoolean === true) {
        //@ts-ignore
        pipeline[0].$facet.results.push({ $skip: skip });
        //@ts-ignore
        pipeline[0].$facet.results.push({ $limit: perPage });
      }
      if (
        _req.query.onBoardingPercentage &&
        _req.query.onBoardingPercentage != "all" &&
        !accountManagerBoolean === true
      ) {
        dataToFind.onBoardingPercentage = parseInt(
          _req.query.onBoardingPercentage
        );
      }

      if (
        _req.query.onBoardingPercentage &&
        _req.query.onBoardingPercentage === "all" &&
        !accountManagerBoolean === true
      ) {
        dataToFind.onBoardingPercentage = {
          $in: [
            ONBOARDING_PERCENTAGE.BUSINESS_DETAILS,
            ONBOARDING_PERCENTAGE.USER_DETAILS,
            ONBOARDING_PERCENTAGE.LEAD_DETAILS,
            ONBOARDING_PERCENTAGE.CARD_DETAILS,
          ],
        };
      }

      const [query]: any = await User.aggregate(pipeline);
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
          (item.accountManager[0]?.firstName || "") +
          " " +
          (item.accountManager[0]?.lastName || "");
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

  static show = async (req: any, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;


      const business = req.query.business;

      const userMatch: Record<string, any> = {};


      if (req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        userMatch.accountManager = new ObjectId(req.user._id);
      }
      const user = await User.findOne ({ _id : req.params.id})
      const allowedRoles = [
        RolesEnum.ACCOUNT_ADMIN,
        RolesEnum.ACCOUNT_MANAGER,
        RolesEnum.ADMIN,
      ];

      if (user?.role && allowedRoles.includes(user.role)) {
        return res.json({ data: user });
      }else{
      const businessDetails = business ? await BusinessDetails.findById(id) : null;

      const users = business
        ? await User.findOne({ businessDetailsId: businessDetails?.id })
        : null;

      const matchId = business ? new ObjectId(users?.id) : new ObjectId(id);

      const query = await User.aggregate([
        {
          $match: {
            _id: matchId,
            ...userMatch,
          },
        },
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
      ]);

      if (query.length > 0) {
        const result = query[0];
        delete result.password;
        result.businessDetailsId = Object.assign(
          {},
          result.businessDetailsId[0]
        );
        result.cardDetailsId = Object.assign({}, result.cardDetailsId[0]);
        result.userLeadsDetailsId = Object.assign(
          {},
          result.userLeadsDetailsId[0]
        );
        result.accountManager = `${result?.accountManager?.firstName} ${
          result?.accountManager?.lastName || ""
        }`;

        return res.json({ data: result });
      } else {
        return res.json({ data: [] });
      }
    }
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", err } });
    }
  };


  static indexName = async (req: Request, res: Response): Promise<Response> => {
    try {
      let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
      let dataToFind: FindOptions = {
        isDeleted: false,
        role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
      };
      if (user?.role === RolesEnum.ACCOUNT_MANAGER) {
        dataToFind.accountManager = new ObjectId(user._id);
      }
      const business = await User.aggregate(
        [
          {
            $match: dataToFind,
          },
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
    let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
    const { id } = req.params;
    const input = req.body;
    const checkUser =
      (await User.findById(id)
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")) ?? ({} as UserInterface);
    if (input.password) {
      delete input.password;
    }
    if (!checkUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    let dataToUpdate: { [key: string]: any } = {};

    if (
      checkUser.role === RolesEnum.ACCOUNT_ADMIN &&
      input.isAccountAdmin === false
    ) {
      dataToUpdate = {
        ...dataToUpdate,
        role: RolesEnum.ADMIN,
        isAccountAdmin: false,
      };
    }

    if (input.isAccountAdmin) {
      dataToUpdate = {
        ...dataToUpdate,
        role: RolesEnum.ACCOUNT_ADMIN,
        isAccountAdmin: true,
      };
    }
    const newRolePermissions: PermissionInterface | null =
      await Permissions.findOne({
        role: dataToUpdate.role,
      });

    if (newRolePermissions) {
      dataToUpdate.permissions = newRolePermissions.permissions;
    }
    await User.findByIdAndUpdate(checkUser.id, dataToUpdate, { new: true });

    if (input.credits && user.role == RolesEnum.USER) {
      delete input.credits;
    }

    if (user.role === RolesEnum.USER && (input.email || input.email == "")) {
      input.email = user?.email;
    }
    if (user.role === RolesEnum.SUPER_ADMIN && input.email) {
      const email = await User.findOne({
        email: input.email,
        isDeleted: false,
      });
      if (email && checkUser.email != email.email) {
        return res.status(400).json({
          error: {
            message: "Email already registered with another user",
          },
        });
      }
    }

    try {
      const businesBeforeUpdate = await BusinessDetails.findById(
        checkUser?.businessDetailsId
      );
      const userForActivity = await User.findById(
        id,
        " -__v -_id -businessDetailsId -businessIndustryId -userLeadsDetailsId -userServiceId -accountManager -onBoarding -createdAt -updatedAt -password"
      ).lean();
      if (
        input.paymentMethod === paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
        user?.role === RolesEnum.USER
      ) {
        return res.status(403).json({
          error: {
            message:
              "Please contact admin to request for weekly payment method",
          },
        });
      }
      if (
        (input.buyerId ||
          input.leadCost ||
          input.ryftClientId ||
          input.xeroContactId ||
          input.role) &&
        user?.role == RolesEnum.USER
      ) {
        return res
          .status(403)
          .json({ error: { message: "Please contact admin to update." } });
      }
      if (
        input.paymentMethod &&
        checkUser?.paymentMethod == paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
        user?.role === RolesEnum.USER
      ) {
        return res.status(403).json({
          error: { message: "Please contact admin to change payment method" },
        });
      }

      if (
        input.isCreditsAndBillingEnabled === false &&
        checkUser?.role === RolesEnum.USER
      ) {
        let object = checkUser.onBoarding;
        object.map((fields) => {
          if (fields.key === ONBOARDING_KEYS.CARD_DETAILS) {
            fields.pendingFields = [];
          }
        });
        await User.findByIdAndUpdate(checkUser?.id, {
          isCreditsAndBillingEnabled: false,
          onBoarding: object,
        });
      }
      if (
        input.isCreditsAndBillingEnabled === true &&
        checkUser?.role === RolesEnum.NON_BILLABLE
      ) {
        let object = checkUser.onBoarding;

        if (!areAllPendingFieldsEmpty(object)) {
          object.map((fields) => {
            if (fields.key === ONBOARDING_KEYS.CARD_DETAILS) {
              fields.pendingFields = [CARD_DETAILS.CARD_NUMBER];
            }
          });
          await User.findByIdAndUpdate(checkUser?.id, {
            isCreditsAndBillingEnabled: false,
            onBoarding: object,
          });
        }
      }

      if (
        (input.secondaryLeadCost && !input.secondaryLeads) ||
        (!input.secondaryLeadCost && input.secondaryLeads)
      ) {
        return res.status(400).json({
          error: {
            message: "Please enter secondary leads and secondary lead cost",
          },
        });
      }
      let secondaryLeadsAnticipating: number;
      if (input.secondaryLeads) {
        secondaryLeadsAnticipating =
          input.secondaryLeads * input.secondaryLeadCost;
        let dataSave = {
          secondaryLeadCost: input.secondaryLeadCost,
          secondaryCredits: secondaryLeadsAnticipating,
          isSecondaryUsage: true,
          secondaryLeads: input.secondaryLeads,
        };

        if (
          input?.secondaryLeadCost &&
          secondaryLeadsAnticipating < input?.secondaryLeadCost
        ) {
          dataSave.isSecondaryUsage = false;
        }
        await User.findByIdAndUpdate(checkUser?.id, dataSave, {
          new: true,
        });

        let dataToSave: Partial<TransactionInterface> = {
          userId: checkUser.id,
          amount: secondaryLeadsAnticipating,
          status: PAYMENT_STATUS.CAPTURED,
          title: transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT,
          isCredited: true,
          creditsLeft: secondaryLeadsAnticipating,
        };
        // if (user?.credits < credits) {
        let transaction = await Transaction.create(dataToSave);
        console.log("transaction", transaction);
        const paramPdf: generatePDFParams = {
          ContactID: checkUser?.xeroContactId,
          desc: transactionTitle.CREDITS_ADDED,
          amount: secondaryLeadsAnticipating,
          freeCredits: 0,
          sessionId: transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT,
          isManualAdjustment: false,
        };
        generatePDF(paramPdf)
          .then(async (res: any) => {
            const dataToSaveInInvoice: Partial<InvoiceInterface> = {
              userId: checkUser?.id,
              transactionId: transaction.id,
              price: secondaryLeadsAnticipating,
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
              const paramPdf: generatePDFParams = {
                ContactID: checkUser?.xeroContactId,
                desc: transactionTitle.CREDITS_ADDED,
                amount: secondaryLeadsAnticipating,
                freeCredits: 0,
                sessionId: transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT,
                isManualAdjustment: false,
              };
              generatePDF(paramPdf).then(async (res: any) => {
                const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                  userId: checkUser?.id,
                  transactionId: transaction.id,
                  price: secondaryLeadsAnticipating,
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
        isDeleted: false,
      });

      if (
        !cardExist &&
        input.credits &&
        (user.role == RolesEnum.USER ||
          user.role == RolesEnum.ADMIN ||
          user.role == RolesEnum.SUPER_ADMIN)
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
          isDeleted: false,
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
      if (
        input.businessSalesNumber &&
        checkUser?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
      ) {
        if (!checkUser.businessDetailsId) {
          return res
            .status(404)
            .json({ error: { message: "business details not found" } });
        }

        const details = await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessSalesNumber: input.businessSalesNumber },

          { new: true }
        );
        let reqBody: PostcodeWebhookParams = {
          userId: checkUser?._id,
          bid: checkUser?.buyerId,
          businessName: details?.businessName,
          businessSalesNumber: input.businessSalesNumber,
          eventCode: EVENT_TITLE.BUSINESS_PHONE_NUMBER,
        };
        await eventsWebhook(reqBody)
          .then(() =>
            console.log(
              "event webhook for updating business phone number hits successfully.",
              reqBody
            )
          )
          .catch((err) =>
            console.log(
              err,
              "error while triggering business phone number webhooks failed",
              reqBody
            )
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
        const userBeforeMod =
          (await UserLeadsDetails.findById(checkUser?.userLeadsDetailsId)) ??
          ({} as UserLeadsDetailsInterface);

        const userAfterMod =
          (await UserLeadsDetails.findByIdAndUpdate(
            checkUser?.userLeadsDetailsId,
            { leadSchedule: input.leadSchedule },

            { new: true }
          )) ?? ({} as UserLeadsDetailsInterface);
        const business = await BusinessDetails.findById(
          checkUser.businessDetailsId
        );

        if (
          input.leadSchedule &&
          !arraysAreEqual(input.leadSchedule, userBeforeMod?.leadSchedule) &&
          user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
        ) {
          let paramsToSend: PostcodeWebhookParams = {
            userId: checkUser?._id,
            buyerId: checkUser?.buyerId,
            businessName: business?.businessName,
            eventCode: EVENT_TITLE.LEAD_SCHEDULE_UPDATE,
            leadSchedule: userAfterMod?.leadSchedule,
          };
          if (userAfterMod.type === POSTCODE_TYPE.RADIUS) {
            (paramsToSend.type = POSTCODE_TYPE.RADIUS),
              (paramsToSend.postcode = userAfterMod.postCodeList);
          } else {
            paramsToSend.postCodeList = flattenPostalCodes(
              userAfterMod?.postCodeTargettingList
            );
          }
          await eventsWebhook(paramsToSend)
            .then(() =>
              console.log(
                "event webhook for postcode updates hits successfully.",
                paramsToSend
              )
            )
            .catch((err) =>
              console.log(
                err,
                "error while triggering postcode updates webhooks failed",
                paramsToSend
              )
            );
        }
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

        const industry = await BuisnessIndustries.findById(
          checkUser.businessIndustryId
        );
        const columns = industry?.columns;

        const result: { [key: string]: string } = {};
        if (columns) {
          for (const item of columns) {
            if (item.isVisible === true) {
              //@ts-ignore
              result[item.originalName] = item.displayName;
            }
          }
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
        const business = await BusinessDetails.findById(
          checkUser.businessDetailsId
        );
        const userBeforeMod =
          (await UserLeadsDetails.findById(checkUser?.userLeadsDetailsId)) ??
          ({} as UserLeadsDetailsInterface);
        const userAfterMod =
          (await UserLeadsDetails.findByIdAndUpdate(
            checkUser?.userLeadsDetailsId,
            { daily: input.daily },

            { new: true }
          )) ?? ({} as UserLeadsDetailsInterface);
        if (
          input.daily != userBeforeMod?.daily &&
          user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS
        ) {
          let paramsToSend: PostcodeWebhookParams = {
            userId: checkUser?._id,
            buyerId: checkUser?.buyerId,
            businessName: business?.businessName,
            eventCode: EVENT_TITLE.DAILY_LEAD_CAP,

            dailyLeadCap: userAfterMod?.daily,
          };
          if (userAfterMod.type === POSTCODE_TYPE.RADIUS) {
            (paramsToSend.type = POSTCODE_TYPE.RADIUS),
              (paramsToSend.postcode = userAfterMod.postCodeList);
          } else {
            paramsToSend.postCodeList = flattenPostalCodes(
              userAfterMod?.postCodeTargettingList
            );
          }

          await eventsWebhook(paramsToSend)
            .then(() =>
              console.log(
                "event webhook for postcode updates hits successfully.",
                paramsToSend
              )
            )
            .catch((err) =>
              console.log(
                err,
                "error while triggering postcode updates webhooks failed",
                paramsToSend
              )
            );
        }
      }
      if (
        input.credits &&
        (user.role == RolesEnum.ADMIN ||
          // @ts-ignore
          user.role == RolesEnum.SUPER_ADMIN)
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
              console.log(
                "xeroContact ID not found. Failed to generate pdf.",
                new Date(),
                "Today's Date"
              );
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
              const paramPdf: generatePDFParams = {
                ContactID: checkUser?.xeroContactId,
                desc: transactionTitle.CREDITS_ADDED,
                amount: input?.credits,
                freeCredits: 0,
                sessionId: _res.data.id,
                isManualAdjustment: false,
              };
              generatePDF(paramPdf)
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

                  console.log("pdf generated", new Date(), "Today's Date");
                })
                .catch(async (err) => {
                  refreshToken().then(async (res) => {
                    const paramPdf: generatePDFParams = {
                      ContactID: checkUser?.xeroContactId,
                      desc: transactionTitle.CREDITS_ADDED,
                      amount: input.credits,
                      freeCredits: 0,
                      sessionId: _res.data.id,
                      isManualAdjustment: false,
                    };
                    generatePDF(paramPdf).then(async (res: any) => {
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

                      console.log("pdf generated", new Date(), "Today's Date");
                    });
                  });
                });
            }

            console.log(
              "payment success!!!!!!!!!!!!!",
              new Date(),
              "Today's Date"
            );

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
          "-__v -_id -businessDetailsId -businessIndustryId -userServiceId -accountManager -userLeadsDetailsId -onBoarding -createdAt -updatedAt -password"
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
            actionBy: user?.role,
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
            message: "Updated Successfully",
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
                actionBy: user?.role,
                actionType: ACTION.UPDATING,
                targetModel: MODEL_ENUM.BUSINESS_DETAILS,
                userEntity: checkUser?.id,
                originalValues: fields.oldFields,
                modifiedValues: fields.updatedFields,
              };
              await ActivityLogs.create(activity);
            }
          }
          cmsUpdateBuyerWebhook(id, cardExist?.id);

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
    let user: Partial<UserInterface> = _req.user ?? ({} as UserInterface);

    const id = _req.query.id;
    const status = _req.query.status;
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
    const industry = _req.query.industry;
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
      if (_req.query.accountManagerId) {
        dataToFind.accountManager = new ObjectId(_req.query.accountManagerId);
      }
      if (_req.query.clientType === FILTER_FOR_CLIENT.NON_BILLABLE) {
        dataToFind.isCreditsAndBillingEnabled = false;
      }
      if (_req.query.clientType === FILTER_FOR_CLIENT.BILLABLE) {
        dataToFind.isCreditsAndBillingEnabled = true;
      }
      if (status) {
        dataToFind.status = status;
      }
      if (id) {
        dataToFind._id = new ObjectId(id);
      }
      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        let ids: any = [];
        const users = await User.find({ accountManager: user._id });
        users.map((user) => {
          return ids.push(new ObjectId(user._id));
        });
        dataToFind._id = { $in: ids };
      }
      if (industry) {
        let ids: any = [];
        const users = await User.find({ businessIndustryId: industry });
        users.map((user) => {
          return ids.push(new ObjectId(user._id));
        });
        dataToFind._id = { $in: ids };
      }
      const [query]: any = await User.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
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

  static userCreditsManualAdjustment = async (req: any, res: Response) => {
    try {
      const input = req.body;
      const user =
        (await User.findById(input.userId)
          .populate("userLeadsDetailsId")
          .populate("businessDetailsId")) ?? ({} as UserInterface);
      const credits = input.credits * parseInt(user?.leadCost);
      if (user?.isDeleted) {
        return res.status(400).json({
          error: {
            message: "User deleted",
          },
        });
      } else if (!user?.buyerId) {
        return res.status(400).json({
          error: {
            message: "User not regsitered on Lead-Byte",
          },
        });
      } else if (!user) {
        return res.status(404).json({
          error: {
            message: "User Not Found",
          },
        });
      } else {
        let amount: number;
        const params = {
          buyerId: user.buyerId,
          fixedAmount: 0,
        };
        let dataToSave: Partial<TransactionInterface> = {
          userId: user.id,
          amount: credits,
          status: PAYMENT_STATUS.CAPTURED,
          title: transactionTitle.MANUAL_ADJUSTMENT,
          paymentType: transactionTitle.MANUAL_ADJUSTMENT,
        };
        // if (user?.credits < credits) {
        amount = credits;
        (params.fixedAmount = amount), (dataToSave.isCredited = true);
        dataToSave.creditsLeft = user.credits+credits;//@hotfix can have many test cases(Copied logic from develop branch)
        addCreditsToBuyer(params).then(async (res) => {
          const transaction = await Transaction.create(dataToSave);
          const paramPdf: generatePDFParams = {
            ContactID: user?.xeroContactId,

            desc: transactionTitle.CREDITS_ADDED,
            amount: 0,
            freeCredits: credits,
            sessionId: transactionTitle.MANUAL_ADJUSTMENT,
            isManualAdjustment: true,
          };
          generatePDF(paramPdf)
            .then(async (res: any) => {
              const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                userId: user?.id,
                transactionId: transaction.id,
                price: credits,
                invoiceId: res.data.Invoices[0].InvoiceID,
              };
              await Invoice.create(dataToSaveInInvoice);
              await Transaction.findByIdAndUpdate(transaction.id, {
                invoiceId: res.data.Invoices[0].InvoiceID,
              });

              console.log("pdf generated", new Date(), "Today's Date");
            })
            .catch(async (err) => {
              refreshToken().then(async (res) => {
                const paramPdf: generatePDFParams = {
                  ContactID: user?.xeroContactId,

                  desc: transactionTitle.CREDITS_ADDED,
                  amount: 0,
                  freeCredits: credits,
                  sessionId: transactionTitle.MANUAL_ADJUSTMENT,
                  isManualAdjustment: true,
                };
                generatePDF(paramPdf).then(async (res: any) => {
                  const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                    userId: user?.id,
                    transactionId: transaction.id,
                    price: credits,
                    invoiceId: res.data.Invoices[0].InvoiceID,
                  };
                  await Invoice.create(dataToSaveInInvoice);
                  await Transaction.findByIdAndUpdate(transaction.id, {
                    invoiceId: res.data.Invoices[0].InvoiceID,
                  });

                  console.log("pdf generated", new Date(), "Today's Date");
                });
              });
            });
          const userBusiness: BusinessDetailsInterface | null =
            isBusinessObject(user?.businessDetailsId)
              ? user?.businessDetailsId
              : null;

          const userLead =
            (await UserLeadsDetails.findById(
              user?.userLeadsDetailsId,
              "postCodeTargettingList"
            )) ?? ({} as UserLeadsDetailsInterface);
          let paramsToSend: PostcodeWebhookParams = {
            userId: user._id,
            buyerId: user.buyerId,
            businessName: userBusiness?.businessName,
            eventCode: EVENT_TITLE.ADD_CREDITS,
            topUpAmount: credits,
          };
          if (userLead.type === POSTCODE_TYPE.RADIUS) {
            (paramsToSend.type = POSTCODE_TYPE.RADIUS),
              (paramsToSend.postcode = userLead.postCodeList);
          } else {
            paramsToSend.postCodeList = flattenPostalCodes(
              userLead?.postCodeTargettingList
            );
          }
          await eventsWebhook(paramsToSend)
            .then(() =>
              console.log(
                "event webhook for add credits hits successfully.",
                paramsToSend,
                new Date(),
                "Today's Date",
                user._id,
                "user's id"
              )
            )
            .catch((err) =>
              console.log(
                "error while triggering webhooks for add credits failed",
                paramsToSend,
                new Date(),
                "Today's Date"
              )
            );
        });

        return res.json({
          data: { message: "Credits Adjusted" },
        });
      }
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static clientsStat = async (_req: any, res: Response) => {
    try {
      let dataToFindActive: Record<
        string,
        string | Types.ObjectId | string[] | boolean | RoleFilter
      > = {
        role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
        isActive: true,
        isDeleted: false,
        isArchived: false,
      };
      let dataToFindPaused: Record<
        string,
        string | Types.ObjectId | string[] | boolean | RoleFilter
      > = {
        role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
        isActive: false,
        isDeleted: false,
        isArchived: false,
      };
      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        dataToFindActive.accountManager = _req.user._id;
        dataToFindPaused.accountManager = _req.user._id;
      }
      const active = await User.find(dataToFindActive).count();
      const paused = await User.find(dataToFindPaused).count();

      const dataToShow = {
        activeClients: active,
        pausedClients: paused,
      };
      return res.json({ data: dataToShow });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static sendTestLeadData = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const input = req.body;
      const checkUser = (await User.findById(id)) ?? ({} as UserInterface);
      if (!checkUser.userLeadsDetailsId) {
        return res
          .status(404)
          .json({ error: { message: "lead details not found" } });
      }
      const industry = await BuisnessIndustries.findById(
        checkUser.businessIndustryId
      );
      const columns = industry?.columns;

      const result: { [key: string]: string } = {};
      if (columns) {
        for (const item of columns) {
          if (item.isVisible === true) {
            //@ts-ignore
            result[item.originalName] = item.displayName;
          }
        }
      }
      let message = "";
      let response = {};
      let status;
      try {
        await sendLeadDataToZap(input.zapierUrl, result, checkUser);
        message = "Test Lead Sent!";
        response = { data: message };
        status = 200;
      } catch (err) {
        message = "Error while sending Test Lead!";
        status = 400;
        response = { data: message };
      }

      return res.status(status).json(response);

      // return res.json({ data: { message: message } });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static autoChargeNow = async (req: any, res: Response): Promise<any> => {
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
      console.error("Error in Auto charge:", error.response);
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
      if (column.isVisible && column.originalName in dataObj) {
        filteredData[column.displayName || column.originalName] =
          dataObj[column.originalName];
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

export function areAllPendingFieldsEmpty(
  object: { key: string; pendingFields: string[]; dependencies: string[] }[]
) {
  for (const item of object) {
    if (item.pendingFields && item.pendingFields.length > 0) {
      return false;
    }
  }
  return true;
}
