import { Request, Response } from "express";
import { sort } from "../../../../utils/Enums/sorting.enum";
import { RolesEnum } from "../../../../types/RolesEnum";
import { FILTER_FOR_CLIENT } from "../../../../utils/Enums/billableFilterEnum";
import mongoose from "mongoose";
import { ONBOARDING_PERCENTAGE } from "../../../../utils/constantFiles/OnBoarding.keys";
import { User } from "../../../Models/User";

const LIMIT = 10;
const ObjectId = mongoose.Types.ObjectId;

export const getUsersActions = async (_req: any, res: Response): Promise<Response> => {
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