import { Response} from "express"
import { UserInterface } from "../../../../types/UserInterface";
import { sort } from "../../../../utils/Enums/sorting.enum";
import { RolesEnum } from "../../../../types/RolesEnum";
import { FILTER_FOR_CLIENT } from "../../../../utils/Enums/billableFilterEnum";
import { Types } from "mongoose";
import { User } from "../../../Models/User";
import { ClientTablePreferenceInterface } from "../../../../types/clientTablePrefrenceInterface";
import { ClientTablePreference } from "../../../Models/ClientTablePrefrence";
import { DataObject } from "../Inputs/DataObject";
import { filterAndTransformData } from "./filterAndTransformData";
import { convertArray } from "./convertArray";

export const showAllClientsForAdminExportFileAction = async (
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
        dataToFind.accountManager = new Types.ObjectId(_req.query.accountManagerId);
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
        dataToFind._id = new Types.ObjectId(id);
      }
      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        let ids: any = [];
        const users = await User.find({ accountManager: user._id });
        users.map((user) => {
          return ids.push(new Types.ObjectId(user._id));
        });
        dataToFind._id = { $in: ids };
      }
      if (industry) {
        let ids: any = [];
        const users = await User.find({ businessIndustryId: industry });
        users.map((user) => {
          return ids.push(new Types.ObjectId(user._id));
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