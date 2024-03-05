import { RolesEnum } from "../../../../types/RolesEnum";
import { Leads } from "../../../Models/Leads";
import { BuisnessIndustries } from "../../../Models/BuisnessIndustries";
import { User } from "../../../Models/User";
import { DataObject } from "../../../../types/DataObject";
import { LeadsInterface } from "../../../../types/LeadsInterface";
import { UserInterface } from "../../../../types/UserInterface";
import { leadsStatusEnums } from "../../../../utils/Enums/leads.status.enum";
// import { prepareDataWithColumnPreferences } from "@spotdif/utils/prepareDataWithColumnPreferences";
import logger from "../../../../utils/winstonLogger/logger";
import { Types } from "mongoose";
import { prepareDataWithColumnPreferences } from "../../../../utils/prepareDataWithColumnPreferences";
import { sendEmailForLeads } from "../../../Middlewares/mail";
import { exportToXlsx } from "../../../../utils/sendgrid/exportToCsv";

export const createLeadsCSVAdmin = async (
  requestingUserRole: string,
  querySearch: string,
  status: string,
  userId: string,
  user: UserInterface,
  industry: string,
  accountManager: string,
  sortingOrder: 1 | -1
) => {
  try {
    let dataToFind: any = {
      $or: [
        {
          status: {
            $in: [
              leadsStatusEnums.REPORTED,
              leadsStatusEnums.REPORT_ACCEPTED,
              leadsStatusEnums.REPORT_REJECTED,
              leadsStatusEnums.ARCHIVED,
              leadsStatusEnums.VALID,
            ],
          },
        },
      ],
    };
    if (userId) {
      const user = await User.findById(userId);
      dataToFind.bid = user?.buyerId;
    }
    if (industry) {
      let bids: any = [];
      const users = await User.find({ businessIndustryId: industry });
      users.map((user) => {
        return bids.push(user.buyerId);
      });
      dataToFind.bid = { $in: bids };
    }
    if (requestingUserRole === RolesEnum.ACCOUNT_MANAGER) {
      let bids: any = [];
      const users = await User.find({ accountManager: user._id });
      users.map((user) => {
        return bids.push(user.buyerId);
      });
      dataToFind.bid = { $in: bids };
    }
    if (querySearch) {
      dataToFind = {
        ...dataToFind,
        $or: [
          { invalidLeadReason: { $regex: querySearch, $options: "i" } },
          { clientNotes: { $regex: querySearch, $options: "i" } },
          { bid: { $regex: querySearch, $options: "i" } },
          { status: { $regex: querySearch, $options: "i" } },
          { "leads.email": { $regex: querySearch, $options: "i" } },
          { "leads.firstName": { $regex: querySearch, $options: "i" } },
          { "leads.lastName": { $regex: querySearch, $options: "i" } },
          { "leads.phone": { $regex: querySearch, $options: "i" } },
          { "leads.address": { $regex: querySearch, $options: "i" } },
        ],
      };
    }
    if (status) {
      dataToFind.status = status;
    }
    if (accountManager) {
      let bids: any = [];
      const users = await User.find({
        accountManager: new Types.ObjectId(accountManager),
      });
      users.map((user) => {
        return bids.push(user.buyerId);
      });
      dataToFind.bid = { $in: bids };
    }

    const batchSize = 1500;
    const totalDocuments = await Leads.countDocuments({ ...dataToFind });
    const totalPages = Math.ceil(totalDocuments / batchSize);

    let documents: Array<LeadsInterface> = [];

    const promises = Array.from({ length: totalPages }, (_, page) => {
      return new Promise<string>(async (resolve, reject) => {
        try {
          const [query]: any = await Leads.aggregate([
            {
              $facet: {
                results: [
                  { $match: dataToFind },
                  {
                    $lookup: {
                      from: "users",
                      localField: "bid",
                      foreignField: "buyerId",
                      as: "clientName",
                    },
                  },

                  { $sort: { createdAt: sortingOrder } },
                  {
                    $project: {
                      rowIndex: 0,
                      __v: 0,
                      updatedAt: 0,
                      "leads.c1": 0,
                    },
                  },
                  {
                    $skip: page * batchSize,
                  },
                  {
                    $limit: batchSize,
                  },
                ],
                leadsCount: [{ $match: dataToFind }, { $count: "count" }],
              },
            },
          ]);
          query.results.map((item: any) => {
            item.leads.clientName =
              item["clientName"][0]?.firstName +
              " " +
              item["clientName"][0]?.lastName;
          });
          documents.push(...query.results);

          resolve("success");
        } catch (error) {
          reject(error.message);
        }
      });
    });

    await Promise.all(promises);

    const pref = await BuisnessIndustries.aggregate([
      {
        $unwind: "$columns",
      },
      {
        $group: {
          _id: "$columns.originalName",
          isVisible: { $first: "$columns.isVisible" },
          displayName: { $first: "$columns.displayName" },
          index: { $first: "$columns.index" },
        },
      },
      {
        $project: {
          _id: 0,
          isVisible: 1,
          originalName: "$_id",
          displayName: 1,
          index: 1,
        },
      },
      {
        $group: {
          _id: null,
          columns: { $push: "$$ROOT" },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    logger.info("pref", pref[0]?.columns);
    const filteredDataArray: DataObject[] = prepareDataWithColumnPreferences(
      //@ts-ignore
      [
        ...pref[0]?.columns,
        {
          isVisible: true,
          displayName: "Client Notes",
          originalName: "clientNotes",
        },
      ],
      convertArray(documents)
      // convertArray(query.results)
    );

    const resultArray = filteredDataArray.map((obj) => {
      const newObj: Record<string, string> = {};
      for (const key in obj) {
        if (key !== "Received") {
          newObj[key] = obj[key] === undefined ? "" : obj[key];
        }
      }
      return newObj;
    });
    // user.email
    const file = await exportToXlsx("Leads", resultArray);
     sendEmailForLeads("walkwelrajan@gmail.com", {
      firstName: user.firstName,
      count: resultArray.length,
      file,
    });
  } catch (err) {
    logger.error("Error in different thread", err);
  }
};

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
