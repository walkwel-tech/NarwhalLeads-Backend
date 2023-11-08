import fs from "fs";
import util from "util";
import mongoose from "mongoose";
import { UserLeadsDetails } from "../../src/app/Models/UserLeadsDetails"; // Import your Mongoose model
import { User } from "../../src/app/Models/User"; // Import your Mongoose model
import { UserLeadsDetailsInterface } from "../../src/types/LeadDetailsInterface";
import { RolesEnum } from "../../src/types/RolesEnum";
import { areAllPendingFieldsEmpty } from "../../src/app/Controllers/user.controller";
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../src/utils/constantFiles/OnBoarding.keys";
import { CardDetails } from "../../src/app/Models/CardDetails";

const mongoURI = `${process.env.DB_URL}`;
const uk = "./public/map/uk.topo.json";
const ir = "./public/map/ireland.topo.json";
const readFileAsync = util.promisify(fs.readFile);

const db = async () => {
  await mongoose.connect(mongoURI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  });
};
const commonPC = async () => {
  let pcs: any = [];
  const data1 = JSON.parse(await readFileAsync(uk, "utf8"));
  const data2 = JSON.parse(await readFileAsync(ir, "utf8"));

  for (const geometryB of data1.objects?.Areas?.geometries) {
    const hascB = geometryB.properties.name;
    for (const geometryA of data2.objects?.IRL_adm1?.geometries) {
      const hascA = geometryA.properties.HASC_1.split(".").pop(); // Split and get the part after the dot
      if (hascA === hascB) {
        pcs.push(hascB);

        break;
      }
    }
  }
  return pcs;
};

const users = async () => {
  const poscodes = await commonPC();
  console.log("---**--COMMON POSTODES--**---", poscodes);
  let arrayOfUsers: any = [];
  let arrayOfLeads: any = [];
  let arrayOfNotLeads: any = [];

  try {
    await db();
    console.log("Connected to MongoDB");

    const users = await UserLeadsDetails.find().exec();

    for (const ld of users) {
      const postCodeTargettingList = ld.postCodeTargettingList;

      const includesTargetPostcodes = postCodeTargettingList.some(
        (item: any) => {
          const postCodesInEntry = item.county;
          return poscodes.some((targetPostcode) =>
            postCodesInEntry.includes(targetPostcode)
          );
        }
      );

      if (includesTargetPostcodes) {
        const user = await User.findOne({ userLeadsDetailsId: ld._id }, "_id");
        arrayOfUsers.push(user?._id);
        arrayOfLeads.push(ld?._id);
      } else {
        arrayOfNotLeads.push(ld?._id);
      }
    }

    // mongoose.connection.close();
  } catch (err) {
    console.error("Error fetching users:", err);
  }

  return { arrayOfLeads, arrayOfUsers, arrayOfNotLeads };
};

const script = async () => {
  const user = await users();
  console.log(
    "---**---USERS HAVNG COMMON POSTCODES IN UK AND IRELAND--**---",
    user
  );
  const { arrayOfLeads, arrayOfNotLeads } = user;
  try {
    return new Promise(async (resolve, reject) => {
      arrayOfNotLeads.map(async (ids) => {
        const lead =
          (await UserLeadsDetails.findById(ids)) ??
          ({} as UserLeadsDetailsInterface);
        const IR_POST_CODE = [
          "CW",
          "CN",
          "CE",
          "CK",
          "DL",

          "GY",
          "KY",
          "KE",
          "KK",
          "LS",
          "LM",
          "LK",
          "LD",
          "LH",
          "MO",
          "MH",
          "MN",
          "OY",
          "RN",
          "SO",
          "TY",
          "WD",
          "WH",
          "WX",
          "WW",
        ];
        const UK_POST_CODE = [
          "AB",
          "AL",
          "B",
          "BA",
          "BB",
          "BD",
          "BH",
          "BL",
          "BN",
          "BR",
          "BS",
          "CA",
          "CB",
          "CF",
          "CH",
          "CM",
          "CO",
          "CR",
          "CT",
          "CV",
          "CW",
          "DA",
          "DD",
          "DE",
          "DG",
          "DH",
          "DL",
          "DN",
          "DT",
          "DY",
          "E",
          "EC",
          "EH",
          "EN",
          "EX",
          "FK",
          "FY",
          "G",
          "GL",
          "GU",
          "HA",
          "HD",
          "HG",
          "HP",
          "HR",
          "HS",
          "HU",
          "HX",
          "IG",
          "IP",
          "IV",
          "KA",
          "KT",
          "KW",
          "KY",
          "L",
          "LA",
          "LD",
          "LE",
          "LL",
          "LN",
          "LS",
          "LU",
          "M",
          "ME",
          "MK",
          "ML",
          "N",
          "NE",
          "NG",
          "NN",
          "NP",
          "NR",
          "NW",
          "OL",
          "OX",
          "PA",
          "PE",
          "PH",
          "PL",
          "PO",
          "PR",
          "RG",
          "RH",
          "RM",
          "S",
          "SA",
          "SE",
          "SG",
          "SK",
          "SL",
          "SM",
          "SN",
          "SO",
          "SP",
          "SR",
          "SS",
          "ST",
          "SW",
          "SY",
          "TA",
          "TD",
          "TF",
          "TN",
          "TQ",
          "TR",
          "TW",
          "UB",
          "W",
          "WA",
          "WC",
          "WD",
          "WF",
          "WN",
          "WR",
          "WS",
          "WV",
          "YO",
          "ZE",
          "BT",
          "GY",
          "IM",
          "JE",
          "TS",
        ];
        const obj: any = [];
        lead.postCodeTargettingList.forEach(
          async (item: { county: string }) => {
            if (UK_POST_CODE.includes(item.county)) {
              obj.push({ ...item, key: "UK" });
            } else if (IR_POST_CODE.includes(item.county)) {
              obj.push({ ...item, key: "IR" });
            }
            // await UserLeadsDetails.findByIdAndUpdate(lead._id, {
            //   postCodeTargettingList: obj,
            // });
          }
        );
      });
    });
  } catch {
    console.log("ERROR");
  }
};

const handleOnBoarding = async () => {
  try {
    const con = await db();
    console.log("connected");
    const users = await User.find({
      role: { $in: [RolesEnum.USER, RolesEnum.NON_BILLABLE] },
    });
    return new Promise((resolve, reject) => {
      users.map(async (user) => {
        if (areAllPendingFieldsEmpty(user.onBoarding)) {
          const a = await User.findByIdAndUpdate(
            user._id,
            { onBoardingPercentage: ONBOARDING_PERCENTAGE.CARD_DETAILS },
            { new: true }
          );
          resolve("updated");
        } else {
          if (!user.businessDetailsId) {
            await User.findByIdAndUpdate(
              user._id,
              { onBoardingPercentage: ONBOARDING_PERCENTAGE.USER_DETAILS },
              { new: true }
            );
          } else if (user.businessDetailsId && !user.userLeadsDetailsId) {
            await User.findByIdAndUpdate(
              user._id,
              { onBoardingPercentage: 50 },
              { new: true }
            );
          } else if (
            user.businessDetailsId &&
            user.userLeadsDetailsId &&
            !user.isCreditsAndBillingEnabled
          ) {
            await User.findByIdAndUpdate(
              user._id,
              { onBoardingPercentage: ONBOARDING_PERCENTAGE.CARD_DETAILS },
              { new: true }
            );
          } else if (
            user.businessDetailsId &&
            user.userLeadsDetailsId &&
            user.isCreditsAndBillingEnabled
          ) {
            const card = await CardDetails.find({
              userId: user.id,
              isDeleted: false,
              status: "success",
            });
            if (card.length > 0) {
              await User.findByIdAndUpdate(
                user._id,
                { onBoardingPercentage: ONBOARDING_PERCENTAGE.CARD_DETAILS },
                { new: true }
              );
            } else {
              await User.findByIdAndUpdate(
                user._id,
                { onBoardingPercentage: ONBOARDING_PERCENTAGE.LEAD_DETAILS },
                { new: true }
              );
            }
          }
        }
      });
    });
  } catch {
    console.log("ERROR");
  }
};
// script();
handleOnBoarding();

export function checkPendingFields(
  object: { key: string; pendingFields: string[]; dependencies: string[] }[]
) {
  for (const item of object) {
    if (item.pendingFields && item.pendingFields.length > 0) {
      return item;
    }
  }
}
