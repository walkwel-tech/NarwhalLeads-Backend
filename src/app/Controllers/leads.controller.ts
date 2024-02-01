import { Request, Response } from "express";
import path from "path";
import * as fs from "fs";
import * as https from "follow-redirects";
// const https = require("follow-redirects").https;
// import mongoose from "mongoose";
import { RolesEnum } from "../../types/RolesEnum";
import { leadsStatusEnums } from "../../utils/Enums/leads.status.enum";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { CardDetails } from "../Models/CardDetails";
import { Leads } from "../Models/Leads";
import { Transaction } from "../Models/Transaction";
import { User } from "../Models/User";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { FileEnum } from "../../types/FileEnum";
import { AccessToken } from "../Models/AccessToken";
import { Invoice } from "../Models/Invoice";
import { refreshToken } from "../../utils/XeroApiIntegration/createContact";
import { DeleteFile } from "../../utils/removeFile";
import {
  sendEmailForBelow5LeadsPending,
  sendEmailForLeadStatusAccept,
  sendEmailForLeadStatusReject,
  sendEmailForNewLead,
  sendEmailForOutOfFunds,
} from "../Middlewares/mail";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
// import { preference } from "../../utils/constantFiles/leadPreferenecColumns";
import { sort } from "../../utils/Enums/sorting.enum";
import { sendLeadDataToZap } from "../../utils/webhookUrls/sendDataZap";
import { WHITE_LIST_IP } from "../../local";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { Column } from "../../types/ColumnsPreferenceInterface";
import mongoose, { Types } from "mongoose";
import { PREMIUM_PROMOLINK } from "../../utils/constantFiles/spotDif.offers.promoLink";
import { Notifications } from "../Models/Notifications";
import { BusinessDetails } from "../Models/BusinessDetails";
import { notify } from "../../utils/notifications/leadNotificationToUser";
import { APP_ENV } from "../../utils/Enums/serverModes.enum";
import { UserInterface } from "../../types/UserInterface";
// import { leadReprocessWebhookLeadCenter } from "../../utils/webhookUrls/leadsReprocessWebhook";
import { LeadsInterface } from "../../types/LeadsInterface";
import { columnsObjects } from "../../types/columnsInterface";
import { leadReportAcceptedWebhook } from "../../utils/webhookUrls/leadReportedAcceptedWebhook";
import { getLeadCenterToken } from "../../utils/Functions/getLeadCenterToken";

import {
  PostcodeWebhookParams,
  eventsWebhook,
} from "../../utils/webhookUrls/eventExpansionWebhook";
import { EVENT_TITLE } from "../../utils/constantFiles/events";
import { flattenPostalCodes } from "../../utils/Functions/flattenPostcodes";
import { POSTCODE_TYPE } from "../../utils/Enums/postcode.enum";
import { ONBOARDING_PERCENTAGE } from "../../utils/constantFiles/OnBoarding.keys";

const ObjectId = mongoose.Types.ObjectId;

const LIMIT = 10;

interface DataObject {
  [key: string]: any;
}

type BidFilter = {
  $in: string[];
};
export class LeadsController {
  static create = async (req: Request, res: Response) => {
    try {
      if (process.env.APP_ENV === APP_ENV.PRODUCTION) {
        //@ts-ignore
        if (!WHITE_LIST_IP.IP.includes(req?.headers["x-forwarded-for"])) {
          return res.status(403).json({
            error: {
              message:
                "Access denied: Your IP address is not allowed to access this API",
            },
          });
        }
      }

      const bid = req.params.buyerId;
      const input = req.body;
      if (Object.keys(input).length === 0) {
        return res.status(400).json({ error: { message: "Data Required." } });
      }
      const user: any = await User.findOne({ buyerId: bid })
        .populate("userLeadsDetailsId")
        .populate("businessDetailsId");
      if (!user?.isLeadReceived) {
        await User.findByIdAndUpdate(user.id, { isLeadReceived: true });
      }
      const originalDailyLimit = user.userLeadsDetailsId?.daily;

      const fiftyPercentVariance = Math.round(
        originalDailyLimit + 0.5 * originalDailyLimit
      );
      //  event webhook to hit when lead  credit is less then leadCost
      if (
        (user?.credits === 0 || user?.credits < user?.leadCost) &&
        user.isCreditsAndBillingEnabled
      ) {
        const paramsToSend: PostcodeWebhookParams = {
          userId: user._id,
          buyerId: user.buyerId,
          businessName: user.businessDetailsId.businessName,
          eventCode: EVENT_TITLE.ZERO_CREDITS,
          remainingCredits: user?.credits,
          dailyCap: fiftyPercentVariance,
          weeklyCap: user.userLeadsDetailsId?.weekly,
          computedCap: Math.round(0.5 * originalDailyLimit),
        };
        if (user.userLeadsDetailsId.type === POSTCODE_TYPE.RADIUS) {
          (paramsToSend.type = POSTCODE_TYPE.RADIUS),
            (paramsToSend.postcode = user.userLeadsDetailsId.postCodeList);
        } else {
          paramsToSend.postCodeList = flattenPostalCodes(
            user.userLeadsDetailsId?.postCodeTargettingList
          )[0].postalCode;
        }

        await eventsWebhook(paramsToSend)
          .then(() =>
            console.log(
              "event webhook for zero credits hits successfully..",
              paramsToSend,
              new Date(),
              "Today's Date"
            )
          )
          .catch((err) =>
            console.log(
              err,
              "error while triggering zero credits webhooks failed",
              paramsToSend,
              new Date(),
              "Today's Date"
            )
          );
      }

      if (
        ( ((user?.credits <=0) &&
          user?.secondaryCredits == 0 &&
          user?.role == RolesEnum.USER &&
          user?.isCreditsAndBillingEnabled == true) && user.credits<user.leadCost)
      ) {
        return res
          .status(400)
          .json({ error: { message: "Insufficient Credits" } });
      }

      const today = new Date();
      const endOfDay = new Date(today);
      endOfDay.setDate(today.getDate() + 1);
      today.setUTCHours(0, 0, 0, 0);
      endOfDay.setUTCHours(0, 0, 0, 0);
      const previous = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: today,
          $lt: endOfDay,
        },
      });
      const startOfWeek = new Date(today);
      startOfWeek.setUTCDate(today.getUTCDate() - today.getUTCDay());

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7);

      const leadsForThisWeek = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: startOfWeek,
          $lt: endOfWeek,
        },
      });

      if (
        previous.length >= fiftyPercentVariance ||
        leadsForThisWeek.length >= user.userLeadsDetailsId.weekly
      ) {
        // 50 % variance implemented here
        const utcDatePlus1Hour = new Date(
          new Date().getTime() + 60 * 60 * 1000
        );
        const ukDate = new Date(utcDatePlus1Hour.getTime());
        const ukDateString = ukDate.toUTCString();

        const debuggingLogs = {
          yesterday: today.toUTCString(),
          today: endOfDay.toUTCString(),
          currentServerTime: ukDateString,
          dailyLimit: user.userLeadsDetailsId?.daily,
          dailyComputedLimit: fiftyPercentVariance,
          weeklyLimit: user.userleadsdetails?.weekly,
        };
        return res.status(400).json({
          error: {
            message: "Daily leads limit exhausted!",
            logs: debuggingLogs,
          },
        });
      }
      const leads: LeadsInterface =
        (await Leads.findOne({ bid: user?.buyerId })
          .sort({ rowIndex: -1 })
          .limit(1)) ?? ({} as LeadsInterface);

      if (user.isSmsNotificationActive) {
        const dataToSent = {
          name: input.firstname + " " + input.lastname,
          email: input.email,
          phoneNumber: input.phone1,
        };
        notify(user.smsPhoneNumber, dataToSent);
      }
      if (user?.userLeadsDetailsId?.sendDataToZapier) {
        sendLeadDataToZap(user.userLeadsDetailsId.zapierUrl, input, user)
          .then((res) => {})
          .catch((err) => {});
      }

      let leadcpl;
      let leadsSave;

      const credits = user?.credits;
      let leftCredits;
      let userf:any;
      leadsSave = await Leads.create({
        bid: bid,
        leadsCost: user.leadCost,
        leads: input,
        status: leadsStatusEnums.VALID,
        industryId: user.businessIndustryId,
        rowIndex: leads?.rowIndex + 1 || 0,
      });
      if (!user.isSecondaryUsage && user.isCreditsAndBillingEnabled) {
        leadcpl = user.leadCost;
        leftCredits = credits - user?.leadCost;
        userf =
          (await User.findByIdAndUpdate(
            user?.id,
            {
              credits: leftCredits,
            },
            { new: true }
          )) ?? ({} as UserInterface);
      } else {
        if(user.isCreditsAndBillingEnabled)
        {      leadcpl = user.secondaryLeadCost;
          let leftSecondaryCredits =
            user.secondaryCredits - user?.secondaryLeadCost;
          if (leftSecondaryCredits === 0) {
            await User.findByIdAndUpdate(user.id, {
              isSecondaryUsage: false,
              secondaryLeads: 0,
              secondaryLeadCost: 0,
            });
          }
          userf =
            (await User.findByIdAndUpdate(
              user?.id,
              {
                secondaryCredits: leftSecondaryCredits,
              },
              { new: true }
            )) ?? ({} as UserInterface);}
      }

      if (
        (userf?.credits === 0 || userf?.credits < parseInt(userf?.leadCost)) &&
        user?.onBoardingPercentage === ONBOARDING_PERCENTAGE.CARD_DETAILS &&
        !user.isSecondaryUsage
      ) {
        let paramsToSend: PostcodeWebhookParams = {
          userId: user._id,
          buyerId: user.buyerId,
          businessName: user.businessDetailsId.businessName,
          eventCode: EVENT_TITLE.ZERO_CREDITS,
          remainingCredits: userf?.credits,
          dailyCap: fiftyPercentVariance,
          weeklyCap: user.userLeadsDetailsId?.weekly,
          computedCap: Math.round(0.5 * originalDailyLimit),
        };

        if (user.userLeadsDetailsId.type === POSTCODE_TYPE.RADIUS) {
          (paramsToSend.type = POSTCODE_TYPE.RADIUS),
            (paramsToSend.postcode = user.userLeadsDetailsId.postCodeList);
        } else {
          paramsToSend.postCodeList = flattenPostalCodes(
            user.userLeadsDetailsId?.postCodeTargettingList
          )[0].postalCode;
        }

        await eventsWebhook(paramsToSend)
          .then(() =>
            console.log(
              "event webhook for zero credits hits successfully.",
              paramsToSend
            )
          )
          .catch((err) =>
            console.log(
              err,
              "error while triggering zero credits webhooks failed",
              paramsToSend
            )
          );
      }

      if (leftCredits && !user.isSecondaryUsage && user.isCreditsAndBillingEnabled) {
        if (leftCredits < leadcpl * PREMIUM_PROMOLINK.LEADS_THRESHOLD) {
          const txn = await Transaction.find({
            title: transactionTitle.CREDITS_ADDED,
          }).sort({ createdAt: -1 });
          const notify: any = await Notifications.find({
            title: "BELOW_5_LEADS_PENDING",
          }).sort({ createdAt: -1 });
          if (txn[0]?.createdAt > notify[0]?.createdAt) {
            sendEmailForBelow5LeadsPending(user.email, {
              credits: leftCredits,
              name: user?.firstName + " " + user?.lastName,
            });
          } else {
            console.log("Email already send.");
          }
        }
        if (leftCredits <= 0) {
          sendEmailForOutOfFunds(user.email, {
            name: user.firstName + " " + user.lastName,
            credits: user.credits,
          });
        } else {
          console.log("Email already send.", new Date(), "Today's Date");
        }
      }

      if (user.isCreditsAndBillingEnabled) {
        let dataToSave: any = {
          userId: user.id,
          isDebited: true,
          title: transactionTitle.NEW_LEAD,
          amount: leadcpl,
          status: "success",
          creditsLeft: user?.credits - leadcpl,
        };
        if (user.isSecondaryUsage) {
          dataToSave.creditsLeft = user.secondaryCredits - user.secondaryLeadCost;
        }
        await Transaction.create(dataToSave);}

      if (
        user.userLeadsDetailsId?.leadAlertsFrequency == leadsAlertsEnums.INSTANT
      ) {
        let arr: any = [];
        Object.keys(input).forEach((key) => {
          if (key != "c1") {
            let obj: any = {};
            obj.keys = key;
            obj.values = input[key];
            arr.push(obj);
          }
        });
        let id = leadsSave._id;
        let encryptedId = btoa(String(id));
        const message: any = {
          userName: user.firstName,
          firstName: input.firstname,
          lastName: input.lastname,
          phone: input.phone1,
          email: input.email,
          id: encryptedId,
        };
        let emails: string[] = [user.email];
        const invitedUsers = await User.find({
          role: RolesEnum.INVITED,
          invitedById: user.id,
          isDeleted: false,
        }).populate("userLeadsDetailsId");
        invitedUsers.map((iUser) => {
          if (
            //@ts-ignore
            iUser?.userLeadsDetailsId?.leadAlertsFrequency ===
            leadsAlertsEnums.INSTANT
          ) {
            emails.push(iUser.email);
          }
        });
        emails.map((users) => {
          sendEmailForNewLead(users, message);
        });
      }

      return res.json({ data: leadsSave });
    } catch (error) {
      console.log("rrrr", error);
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static update = async (req: Request, res: Response): Promise<any> => {
    const leadId = req.params.id;
    const input = req.body;
    const lead: any = (await Leads.findById(leadId)) ?? ({} as LeadsInterface);
    let currentUser: Partial<UserInterface> = req.user ?? ({} as UserInterface);

    try {
      if (!lead) {
        return res.status(404).json({ error: { message: "Lead Not Found" } });
      }
      const user: any = await User.findOne({ buyerId: lead?.bid })
        .populate("businessDetailsId")
        .populate("businessIndustryId");
      if (!user) {
        return res
          .status(400)
          .json({ error: { message: "User of this lead does not exist" } });
      }
      if (
        currentUser?.role == RolesEnum.USER &&
        (input?.status == leadsStatusEnums.REPORT_ACCEPTED ||
          input?.status == leadsStatusEnums.REPORT_REJECTED)
      ) {
        return res.status(403).json({
          error: { message: "Only admin can reject or accept the status." },
        });
      }

      if (input?.invalidLeadReason == "Select Option") {
        input.invalidLeadReason = "";
        await Leads.findByIdAndUpdate(
          leadId,
          { status: leadsStatusEnums.VALID, statusUpdatedAt: new Date() },
          { new: true }
        );
      }
      if (
        input?.invalidLeadReason &&
        input?.invalidLeadReason != "Select Option"
      ) {
        await Leads.findByIdAndUpdate(
          leadId,
          {
            status: leadsStatusEnums.REPORTED,
            reportedAt: new Date(),
            statusUpdatedAt: new Date(),
            clientNotes: input?.clientNotes,
          },
          { new: true }
        );
      }

      if (input.isReprocessed) {
        await Leads.findByIdAndUpdate(
          leadId,
          {
            isReprocessed: true,
            reprocessedAt: new Date(),
          },
          { new: true }
        );
      }
      if (
        lead?.status != leadsStatusEnums.REPORTED &&
        (currentUser.role === RolesEnum.ADMIN ||
          currentUser.role == RolesEnum.SUPER_ADMIN) &&
        (input.status == leadsStatusEnums.REPORT_ACCEPTED ||
          input.status == leadsStatusEnums.REPORT_REJECTED)
      ) {
        return res.status(400).json({
          error: {
            message:
              "You can not update the status because it is not reported.",
          },
        });
      }

      if (
        lead?.status === leadsStatusEnums.REPORTED &&
        input.status == leadsStatusEnums.ARCHIVED
      ) {
        return res.status(400).json({
          error: {
            message: "You can not archive this lead.",
          },
        });
      }

      if (
        (currentUser.role === RolesEnum.ADMIN ||
          currentUser.role === RolesEnum.SUPER_ADMIN) &&
        input.status === leadsStatusEnums.ARCHIVED
      ) {
        return res.status(400).json({
          error: {
            message: "You can not archive this lead.",
          },
        });
      }

      if (
        (currentUser.role === RolesEnum.ADMIN ||
          currentUser.role === RolesEnum.SUPER_ADMIN) &&
        input.status == leadsStatusEnums.REPORT_REJECTED
      ) {
        const leadUser: any = await User.findOne({ buyerId: lead?.bid });

        const message: any = {
          name: leadUser.firstName + " " + leadUser.lastName,
        };
        sendEmailForLeadStatusReject(leadUser?.email, message);
        const leadsUpdate = await Leads.findByIdAndUpdate(
          leadId,
          {
            ...input,
            reportRejectedAt: new Date(),
            statusUpdatedAt: new Date(),
          },
          { new: true }
        );
        return res.json({ data: leadsUpdate });
      }
      if (input.status) {
        await Leads.findByIdAndUpdate(
          leadId,
          { webhookHits: false, webhookHitsCounts: 0 },
          { new: true }
        );
      }
      if (
        (currentUser.role === RolesEnum.ADMIN ||
          currentUser.role === RolesEnum.SUPER_ADMIN) &&
        input.status == leadsStatusEnums.REPORT_ACCEPTED
      ) {
        const user = await User.findOne({ buyerId: lead?.bid });
        const card = await CardDetails.findOne({
          userId: user?.id,
          isDefault: true,
          isDeleted: false,
        });
        const payment: any = {
          buyerId: lead?.bid,
          fixedAmount: lead?.leadsCost,
          freeCredits: 0,
        };
        const leadUser: any = await User.findOne({ buyerId: lead?.bid });

        const message: any = {
          name: leadUser.firstName + " " + leadUser.lastName,
        };
        sendEmailForLeadStatusAccept(leadUser?.email, message);
        const business = await BusinessDetails.findById(
          user?.businessDetailsId,
          "businessName businessIndustry"
        );
        let reqBody = {
          leadId: lead.leads?.leadId,
          // industry: business?.businessIndustry,
          industry: business?.businessIndustry === "Windows & Doors" ? "Windows" :business?.businessIndustry, // as -676 task
          client: business?.businessName,
          supplier: lead.leads?.sid,
          quantity: 1,
          date: new Date(),
          reason: lead.invalidLeadReason,
        };
        leadReportAcceptedWebhook(leadUser, reqBody)
          .then(() => {
            console.log(
              "lead Report accepted Webhook webhook hits successfully",
              new Date(),
              "Today's Date"
            );
          })
          .catch((err) => {
            if (err.status === 401) {
              getLeadCenterToken()
                .then((res) => {
                  leadReportAcceptedWebhook(leadUser, reqBody)
                    .then(() => {
                      console.log(
                        "lead Report accepted Webhook webhook hits successfully",
                        new Date(),
                        "Today's Date"
                      );
                    })
                    .catch((err) =>
                      console.error(
                        "error in hitting webhook for report accepted",
                        err
                      )
                    );
                })
                .catch((err) => {
                  console.error(err, "login error");
                });
            } else {
              console.error("body not passed properly", err);
            }
          });

        addCreditsToBuyer(payment)
          .then(async () => {
            const dataToSave: any = {
              userId: user?.id,
              cardId: card?.id,
              amount: lead?.leadsCost,
              title: transactionTitle.LEAD_REJECTION_APPROVED,
              isCredited: true,
              status: "success",
              creditsLeft: user?.credits + lead?.leadsCost,
            };
            await Transaction.create(dataToSave);
            const leadsUpdate = await Leads.findByIdAndUpdate(
              leadId,
              {
                ...input,
                reportAcceptedAt: new Date(),
                statusUpdatedAt: new Date(),
              },
              { new: true }
            );
            return res.json({ data: leadsUpdate });
          })
          .catch(async (err) => {
            console.log(
              "error while adding credits",
              err,
              new Date(),
              "Today's Date"
            );
            const dataToSave: any = {
              userId: user?.id,
              cardId: card?.id,
              amount: lead?.leadsCost,
              title: transactionTitle.LEAD_REJECTION_APPROVED,
              isCredited: true,
              status: "error",
              creditsLeft: user?.credits,
            };
            await Transaction.create(dataToSave);
          });
      } else {
        const leadsUpdate = await Leads.findByIdAndUpdate(
          leadId,
          { ...input, statusUpdatedAt: new Date() },
          { new: true }
        );
        return res.json({ data: leadsUpdate });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static revenue = async (_req: any, res: Response): Promise<Response> => {
    const id = _req?.user.id;
    const user = await User.findById(id);

    try {
      const perPage =
        _req.query && _req.query?.perPage > 0
          ? parseInt(_req.query?.perPage)
          : LIMIT;
      let skip =
        (_req.query && _req.query?.page > 0
          ? parseInt(_req.query?.page) - 1
          : 0) * perPage;
      let dataToFind: any = {
        bid: user?.buyerId,
      };
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            { "leads.county": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        // skip = 0;
      }

      const [query]: any = await Leads.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
              {
                $group: {
                  _id: { country: "$leads.county" },

                  total: {
                    $sum: "$leadsCost",
                  },
                },
              },
              { $skip: skip },
              { $limit: perPage },
              { $sort: { leadsCost: -1 } },
            ],
            revenueCount: [
              { $match: dataToFind },
              {
                $group: {
                  _id: { country: "$leads.county" },
                  total: {
                    $sum: "$leadsCost",
                  },
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]);
      const revenueCount = query.revenueCount[0]?.count || 0;
      const totalPages = Math.ceil(revenueCount / perPage);

      return res.json({
        data: query.results,
        meta: {
          perPage: perPage,
          page: _req.query?.page || 1,
          pages: totalPages,
          total: revenueCount,
        },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static leadById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;

    try {
      const leads = await Leads.findById(id);

      if (leads) {
        return res.json({ data: leads });
      }

      return res.status(404).json({ error: { message: "leads not found." } });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static leadsCountDashboardChart = async (
    _req: Request,
    res: Response
  ): Promise<Response> => {
    //@ts-ignore
    const id = _req.user?.id;
    const start: any = _req.query.start;
    const end: any = _req.query.end;
    const user = await User.findById(id);
    const newEnd = new Date(end).setDate(new Date(end).getDate() + 1);
    let dataToFind: any = { bid: user?.buyerId };
    if (start) {
      dataToFind = {
        ...dataToFind,
        createdAt: {
          ...dataToFind.createdAt,
          $gte: new Date(start),
        },
      };
    }
    if (end) {
      dataToFind = {
        ...dataToFind,
        createdAt: {
          ...dataToFind.createdAt,
          $lte: new Date(newEnd),
        },
      };
    }
    try {
      if (
        //@ts-ignore
        _req.user?.role == RolesEnum["ADMIN"] ||
        //@ts-ignore
        _req.user?.role == RolesEnum.SUPER_ADMIN
      ) {
        const leads = await Leads.aggregate([
          {
            $facet: {
              results: [
                {
                  $match: {
                    createdAt: {
                      $gte: new Date(start),
                      $lte: new Date(newEnd),
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      // $month: "$createdAt",
                      date: { $dayOfMonth: "$createdAt" },
                      month: { $month: "$createdAt" },
                      year: { $year: "$createdAt" },
                    },
                    count: { $sum: 1 },
                  },
                },
              ],
            },
          },
        ]);
        if (leads) {
          let array: {}[] = [];
          leads[0].results.forEach((lead: any) => {
            let obj: any = {};
            obj.date = lead._id.date;
            obj.month = lead._id.month;
            obj.year = lead._id.year;
            obj.count = lead.count;
            array.push(obj);
          });
          return res.json({ data: array });
        }
      }
      const leads = await Leads.aggregate([
        {
          $facet: {
            results: [
              {
                $match: dataToFind,
              },
              {
                $group: {
                  _id: {
                    // $month: "$createdAt",
                    date: { $dayOfMonth: "$createdAt" },
                    month: { $month: "$createdAt" },
                    year: { $year: "$createdAt" },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]);
      if (leads.length > 0) {
        let array: {}[] = [];
        leads[0].results.forEach((lead: any) => {
          let obj: any = {};
          obj.date = lead._id.date;
          obj.month = lead._id.month;
          obj.year = lead._id.year;
          obj.count = lead.count;
          array.push(obj);
        });

        return res.json({ data: array });
      }
      return res.status(404).json({ error: { message: "leads not found." } });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static totalLeadCostDashboardChart = async (
    _req: Request,
    res: Response
  ): Promise<Response> => {
    //@ts-ignore
    const id = _req.user?.id;
    const user = await User.findById(id);
    const start: any = _req.query?.start;
    const end: any = _req.query?.end;
    const newEnd = new Date(end).setDate(new Date(end).getDate() + 1);
    let dataToFind: any = { bid: user?.buyerId };
    if (start) {
      dataToFind = {
        ...dataToFind,
        createdAt: {
          ...dataToFind.createdAt,
          $gte: new Date(start),
        },
      };
    }
    if (end) {
      dataToFind = {
        ...dataToFind,
        createdAt: {
          ...dataToFind.createdAt,
          $lte: new Date(newEnd),
        },
      };
    }

    try {
      if (
        //@ts-ignore
        _req.user?.role == RolesEnum["ADMIN"] ||
        //@ts-ignore
        _req.user?.role == RolesEnum.SUPER_ADMIN
      ) {
        const leads = await Leads.aggregate([
          {
            $facet: {
              results: [
                {
                  $match: {
                    createdAt: {
                      $gte: new Date(start),
                      $lte: new Date(newEnd),
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      // $month: "$createdAt",
                      date: { $dayOfMonth: "$createdAt" },
                      month: { $month: "$createdAt" },
                      year: { $year: "$createdAt" },
                    },
                    total: {
                      $sum: "$leadsCost",
                    },
                  },
                },
              ],
            },
          },
        ]);
        if (leads) {
          let array: chart[] = [];
          leads[0].results.forEach((lead: any) => {
            let obj: chart = {
              total: 0,
            };
            obj.date = lead._id.date;
            obj.month = lead._id.month;
            obj.year = lead._id.year;
            obj.total = lead.total;
            array.push(obj);
          });
          interface chart {
            date?: Date;
            month?: String;
            year?: String;
            total: number;
          }
          const earnings = array.reduce(
            (acc, cum) => {
              return { total: acc.total + cum.total };
            },
            { total: 0 }
          );
          return res.json({ data: array, earnings: earnings.total });
        }
      }
      const leads = await Leads.aggregate([
        {
          $facet: {
            results: [
              {
                $match: dataToFind,
              },
              {
                $group: {
                  _id: {
                    date: { $dayOfMonth: "$createdAt" },
                    month: { $month: "$createdAt" },
                    year: { $year: "$createdAt" },
                  },
                  total: {
                    $sum: "$leadsCost",
                  },
                },
              },
            ],
          },
        },
      ]);

      if (leads) {
        let array: {}[] = [];
        leads[0].results.forEach((lead: any) => {
          let obj: any = {};
          obj.date = lead._id.date;
          obj.month = lead._id.month;
          obj.year = lead._id.year;
          obj.total = lead.total;
          array.push(obj);
        });
        return res.json({ data: array });
      }

      return res.status(404).json({ error: { message: "leads not found." } });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static index = async (_req: any, res: Response): Promise<any> => {
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    const userId = _req.user?.id;
    // const archive: Boolean = _req.query.archive || false;
    const status = _req.query.status;
    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
    const perPage =
      _req.query && _req.query.perPage > 0
        ? parseInt(_req.query.perPage)
        : LIMIT;
    let skip =
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;

    try {
      let dataToFind: any = { status: { $nin: [leadsStatusEnums.ARCHIVED] } };
      const user = await User.findById(userId);
      if (user?.role == RolesEnum.INVITED) {
        const invitedBy = await User.findOne({ _id: user?.invitedById });
        dataToFind.bid = invitedBy?.buyerId;
      } else {
        dataToFind.bid = user?.buyerId;
      }
      if (status) {
        dataToFind.status = status;
      }
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            { invalidLeadReason: { $regex: _req.query.search, $options: "i" } },
            { leadRemarks: { $regex: _req.query.search, $options: "i" } },
            { clientNotes: { $regex: _req.query.search, $options: "i" } },
            { bid: { $regex: _req.query.search, $options: "i" } },
            { status: { $regex: _req.query.search, $options: "i" } },
            { "leads.email": { $regex: _req.query.search, $options: "i" } },
            { "leads.firstname": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastname": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        // skip = 0;
      }
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
              {
                $lookup: {
                  from: "users", // Replace with the actual name of your "BusinessDetails" collection
                  localField: "clientName.accountManager",
                  foreignField: "_id",
                  as: "accountManager",
                },
              },
              // @ts-ignore
              ...(user?.accountManager &&user?.accountManager?.length >0
                ? [
                    {
                      $unwind: "$accountManager",
                    },
                  ]
                : []),
              // { $sort: { rowIndex: -1 } },
              { $sort: { createdAt: sortingOrder } },
              { $skip: skip },
              { $limit: perPage },
              {
                $project: {
                  verifiedAt: 0,
                  isVerified: 0,
                  // isActive: 0,
                  activatedAt: 0,
                  isDeleted: 0,
                  deletedAt: 0,
                  __v: 0,
                  // isArchived:0,
                  // createdAt: 0,
                  updatedAt: 0,
                  "leads.c1": 0,
                  feedbackForNMG: 0,
                  clientNotes1: 0,
                  clientNotes2: 0,
                  clientNotes3: 0,
                  bid: 0,
                  leadsCost: 0,
                  sendDataToZapier: 0,
                  "clientName.password": 0,
                  "clientName.autoCharge": 0,
                  "clientName.leadCost": 0,
                  "clientName.isRyftCustomer": 0,
                  "clientName.isArchived": 0,
                  "clientName.isLeadbyteCustomer": 0,
                  "clientName.autoChargeAmount": 0,
                  "clientName.verifiedAt": 0,
                  "clientName.isVerified": 0,
                  "clientName.isActive": 0,
                  // "clientName.businessDetailsId": 0,
                  "clientName.businessIndustryId": 0,
                  "clientName.userLeadsDetailsId": 0,
                  "clientName.onBoarding": 0,
                  "clientName.registrationMailSentToAdmin": 0,
                  "clientName.createdAt": 0,
                  "clientName.activatedAt": 0,
                  "clientName.isDeleted": 0,
                  "clientName.invitedById": 0,
                  "clientName.__v": 0,
                  "clientName.buyerId": 0,
                  "clientName.role": 0,
                  "clientName.permissions": 0,
                  "accountManager.password": 0,
                  // "clientName.businessDetailsId": 1,
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);


      const promises = query.results.map((item: any) => {
        item.leads.clientName =
          item["clientName"][0]?.firstName +
          " " +
          item["clientName"][0]?.lastName;
        item.leads.accountManager =
          item["accountManager"]?.firstName +
          " " +
          (item["accountManager"].lastName || "");
        item.leads.status = item.status;
        const columnMapping: Record<string, string> = {};

        BuisnessIndustries.findById(user?.businessIndustryId)
          .then((industry) => {
            industry?.columns.map((column: columnsObjects) => {
              if (
                column.displayName &&
                column.originalName &&
                column.isVisible === true
              ) {
                columnMapping[column.displayName] = column.originalName;
              }
            });
            for (const displayName in columnMapping) {
              const originalName = columnMapping[displayName];
              const leads = item.leads;
              if (leads.hasOwnProperty(originalName)) {
                leads[originalName] = leads[originalName];
              } else {
                leads[originalName] = "";
              }
            }
            // item.columns = industry?.columns ? industry.columns: [];
          })
          .catch((error: any) => {
            console.log("ERRORR: ", error, new Date(), "Today's Date");
          });
        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then(async (businesss) => {
              const industry = await BuisnessIndustries.findOne({
                industry: businesss?.businessIndustry,
              });
              item.leads.businessName = businesss?.businessName;
              item.leads.businessIndustry = businesss?.businessIndustry;
              item.columns = industry?.columns ?? [];

              resolve(item); // Resolve the promise with the modified item
            })
            .catch((error) => {
              reject(error); // Reject the promise if there's an error
            });
        });
      });

      // Use Promise.all to wait for all promises to resolve
      Promise.all(promises)
        .then((updatedResults) => {
          // Handle the updatedResults here
          const leadsCount = query.leadsCount[0]?.count || 0;

          const totalPages = Math.ceil(leadsCount / perPage);
          return res.json({
            data: query.results,
            meta: {
              perPage: perPage,
              page: _req.query.page || 1,
              pages: totalPages,
              total: leadsCount,
            },
          });
        })
        .catch((error) => {
          console.error(error);
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

  static showReportedLeads = async (_req: any, res: Response): Promise<any> => {
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    // const userId = _req.user?.id;
    // const archive: Boolean = _req.query.archive || false;
    const status = _req.query.status;

    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
    const perPage =
      _req.query && _req.query.perPage > 0
        ? parseInt(_req.query.perPage)
        : LIMIT;
    let skip =
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;

    try {
      let dataToFind: any = {
        $or: [
          {
            status: {
              $in: [
                leadsStatusEnums.REPORTED,
                leadsStatusEnums.REPORT_ACCEPTED,
                leadsStatusEnums.REPORT_REJECTED,
                // leadsStatusEnums.ARCHIVED,
              ],
            },
          },
        ],
      };
      let bids: string[] = [];
      if (_req.query.accountManagerId != "" && _req.query.accountManagerId) {
        const users = await User.find({
          accountManager: _req.query.accountManagerId,
        });
        users.map((user: UserInterface) => {
          return bids.push(user.buyerId);
        });
      }

      if (_req.query.accountManagerId) {
        dataToFind.bid = { $in: bids };
      }
      if (_req.query.industryId) {
        dataToFind.industryId = new ObjectId(_req.query.industryId);
      }
      if (_req.query.userId) {
        const businesses = await BusinessDetails.findById(_req.query.userId);

        const user = await User.findOne({ businessDetailsId: businesses?.id });

        dataToFind.bid = user?.buyerId;
      }

      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            { invalidLeadReason: { $regex: _req.query.search, $options: "i" } },
            { clientNotes: { $regex: _req.query.search, $options: "i" } },
            { bid: { $regex: _req.query.search, $options: "i" } },
            { status: { $regex: _req.query.search, $options: "i" } },
            { "leads.email": { $regex: _req.query.search, $options: "i" } },
            { "leads.firstname": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastname": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        // skip = 0;
      }
      if (status) {
        dataToFind.status = status;
        // dataToFind = { status: status };
      }

      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        const users = await User.find({
          accountManager: _req.user._id,
        });
        users.map((user: UserInterface) => {
          return bids.push(user.buyerId);
        });
        dataToFind.bid = { $in: bids };
      }
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
              {
                $lookup: {
                  from: "users", // Replace with the actual name of your "BusinessDetails" collection
                  localField: "clientName.accountManager",
                  foreignField: "_id",
                  as: "accountManager",
                },
              },
              {
                $unwind: "$accountManager",
              },
              // { $sort: { rowIndex: -1 } },
              { $sort: { createdAt: sortingOrder } },
              { $skip: skip },
              { $limit: perPage },
              {
                $project: {
                  verifiedAt: 0,
                  isVerified: 0,
                  // isActive: 0,
                  activatedAt: 0,
                  isDeleted: 0,
                  deletedAt: 0,
                  __v: 0,
                  // isArchived:0,
                  // createdAt: 0,
                  feedbackForNMG: 0,
                  clientNotes1: 0,
                  clientNotes2: 0,
                  clientNotes3: 0,
                  bid: 0,
                  leadsCost: 0,
                  updatedAt: 0,
                  "leads.c1": 0,
                  "clientName.password": 0,
                  "clientName.autoCharge": 0,
                  "clientName.leadCost": 0,
                  "clientName.isRyftCustomer": 0,
                  "clientName.isArchived": 0,
                  "clientName.isLeadbyteCustomer": 0,
                  "clientName.autoChargeAmount": 0,
                  "clientName.verifiedAt": 0,
                  "clientName.isVerified": 0,
                  "clientName.isActive": 0,
                  // "clientName.businessDetailsId": 0,
                  "clientName.userLeadsDetailsId": 0,
                  "clientName.onBoarding": 0,
                  "clientName.registrationMailSentToAdmin": 0,
                  "clientName.createdAt": 0,
                  "clientName.activatedAt": 0,
                  "clientName.isDeleted": 0,
                  "clientName.invitedById": 0,
                  "clientName.__v": 0,
                  "clientName.buyerId": 0,
                  "clientName.role": 0,
                  "accountManager.password": 0,
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      // query.results.map((item: any) => {
      // let clientName = Object.assign({}, item["clientName"][0]);
      // item.clientName = clientName;
      // });
      const promises = query.results.map((item: any) => {
        if (!item["clientName"][0]?.deletedAt) {
          item.leads.clientName =
            item["clientName"][0]?.firstName +
            " " +
            item["clientName"][0]?.lastName;
          item.leads.accountManager =
            item["accountManager"]?.firstName +
            " " +
            (item["accountManager"].lastName || "");
        } else {
          item.leads.clientName = "Deleted User";
        }
        item.leads.status = item.status;
        item.leads.businessName = "Deleted";
        item.leads.businessIndustry = "Deleted";
        const columnMapping: Record<string, string> = {};

        BuisnessIndustries.findById(
          item["clientName"][0]?.businessIndustryId
        ).then((industry) => {
          industry?.columns.map((column: columnsObjects) => {
            if (
              column.displayName &&
              column.originalName &&
              column.isVisible === true
            ) {
              columnMapping[column.displayName] = column.originalName;
            }
          });
          for (const displayName in columnMapping) {
            const originalName = columnMapping[displayName];
            const leads = item.leads;
            if (leads.hasOwnProperty(originalName)) {
              leads[originalName] = leads[originalName];
            } else {
              leads[originalName] = "";
            }
          }
          // item.columns = industry?.columns;
        });

        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then(async (businesss) => {
              if (businesss) {
                item.leads.businessName = businesss?.businessName;
                item.leads.businessIndustry = businesss?.businessIndustry;
              } else {
                item.leads.businessName = "Deleted Business Details";
                item.leads.businessIndustry = "Deleted Business Industry";
              }
              const industry = await BuisnessIndustries.findOne({
                industry: businesss?.businessIndustry,
              });

              item.columns = industry?.columns ?? [];
              resolve(item); // Resolve the promise with the modified item
            })
            .catch((error) => {
              reject(error); // Reject the promise if there's an error
            });
        });
      });

      // Use Promise.all to wait for all promises to resolve
      Promise.all(promises)
        .then((updatedResults) => {
          // Handle the updatedResults here
          const leadsCount = query.leadsCount[0]?.count || 0;

          const totalPages = Math.ceil(leadsCount / perPage);
          return res.json({
            data: query.results,
            meta: {
              perPage: perPage,
              page: _req.query.page || 1,
              pages: totalPages,
              total: leadsCount,
            },
          });
        })
        .catch((error) => {
          console.error(error);
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

  static reOrderIndex = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    try {
      input.forEach(async (key: { _id: any; rowIndex: any }) => {
        await Leads.findByIdAndUpdate(
          { _id: key._id },
          { rowIndex: key.rowIndex },
          { new: true }
        );
      });
      return res.json({ data: { message: "leads list re-ordered!" } });
    } catch {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showAllLeadsToAdminByUserId = async (
    _req: any,
    res: Response
  ): Promise<any> => {
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
    const userId = _req.params.id;
    const status = _req.query.status;
    const perPage =
      _req.query && _req.query.perPage > 0
        ? parseInt(_req.query.perPage)
        : LIMIT;
    let skip =
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;
    try {
      const businesses = await BusinessDetails.findById(userId);
      const user = await User.findOne({ businessDetailsId: businesses?.id });
      let dataToFind: any = {
        bid: user?.buyerId,
        status: { $nin: [leadsStatusEnums.ARCHIVED] },
      };
      if (status) {
        dataToFind.status = status;
      }
      if (_req.query.industryId) {
        dataToFind.industryId = new ObjectId(_req.query.industryId);
      }
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            { invalidLeadReason: { $regex: _req.query.search, $options: "i" } },
            { leadRemarks: { $regex: _req.query.search, $options: "i" } },
            { feedbackForNMG: { $regex: _req.query.search, $options: "i" } },
            { clientNotes1: { $regex: _req.query.search, $options: "i" } },
            { clientNotes2: { $regex: _req.query.search, $options: "i" } },
            { clientNotes3: { $regex: _req.query.search, $options: "i" } },
            { bid: { $regex: _req.query.search, $options: "i" } },
            { status: { $regex: _req.query.search, $options: "i" } },
            { "leads.email": { $regex: _req.query.search, $options: "i" } },
            { "leads.firstname": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastname": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        // skip = 0;
      }

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
              {
                $lookup: {
                  from: "users", // Replace with the actual name of your "BusinessDetails" collection
                  localField: "clientName.accountManager",
                  foreignField: "_id",
                  as: "accountManager",
                },
              },
              {
                $unwind: "$accountManager",
              },
              { $sort: { createdAt: sortingOrder } },
              { $skip: skip },
              { $limit: perPage },
              {
                $project: {
                  verifiedAt: 0,
                  isVerified: 0,
                  // isActive: 0,
                  activatedAt: 0,
                  isDeleted: 0,
                  deletedAt: 0,
                  __v: 0,
                  // isArchived:0,
                  // createdAt: 0,
                  feedbackForNMG: 0,
                  clientNotes1: 0,
                  clientNotes2: 0,
                  clientNotes3: 0,
                  bid: 0,
                  leadsCost: 0,
                  updatedAt: 0,
                  "leads.c1": 0,
                  "clientName.password": 0,
                  "clientName.autoCharge": 0,
                  "clientName.leadCost": 0,
                  "clientName.isRyftCustomer": 0,
                  "clientName.isArchived": 0,
                  "clientName.isLeadbyteCustomer": 0,
                  "clientName.autoChargeAmount": 0,
                  "clientName.verifiedAt": 0,
                  "clientName.isVerified": 0,
                  "clientName.isActive": 0,
                  // "clientName.businessDetailsId": 0,
                  // "clientName.businessIndustryId": 0,
                  "clientName.userLeadsDetailsId": 0,
                  "clientName.onBoarding": 0,
                  "clientName.registrationMailSentToAdmin": 0,
                  "clientName.createdAt": 0,
                  "clientName.activatedAt": 0,
                  "clientName.isDeleted": 0,
                  "clientName.invitedById": 0,
                  "clientName.__v": 0,
                  "clientName.buyerId": 0,
                  "clientName.role": 0,
                  "clientName.permissions": 0,
                  "accountManager.password": 0,
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      const promises = query.results.map((item: any) => {
        if (!item["clientName"][0].deletedAt) {
          item.leads.clientName =
            item["clientName"][0]?.firstName +
            " " +
            item["clientName"][0]?.lastName;
          item.leads.accountManager =
            item["accountManager"]?.firstName +
            " " +
            (item["accountManager"].lastName || "");
        } else {
          item.leads.clientName = "Deleted User";
        }
        item.leads.status = item.status;
        item.leads.businessName = "Deleted";
        item.leads.businessIndustry = "Deleted";
        const columnMapping: Record<string, string> = {};
        BuisnessIndustries.findById(user?.businessIndustryId).then(
          (industry) => {
            industry?.columns.map((column: columnsObjects) => {
              if (
                column.displayName &&
                column.originalName &&
                column.isVisible === true
              ) {
                columnMapping[column.displayName] = column.originalName;
              }
            });
            for (const displayName in columnMapping) {
              const originalName = columnMapping[displayName];
              const leads = item.leads;
              if (leads.hasOwnProperty(originalName)) {
                leads[originalName] = leads[originalName];
              } else {
                leads[originalName] = "";
              }
            }
            // item.columns = industry?.columns;
          }
        );
        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then(async (businesss) => {
              if (businesss) {
                item.leads.businessName = businesss?.businessName;
                item.leads.businessIndustry = businesss?.businessIndustry;
              } else {
                item.leads.businessName = "Deleted Business Details";
                item.leads.businessIndustry = "Deleted Business Industry";
              }
              const industry = await BuisnessIndustries.findOne({
                industry: businesss?.businessIndustry,
              });

              item.columns = industry?.columns ?? [];

              resolve(item); // Resolve the promise with the modified item
            })
            .catch((error) => {
              reject(error); // Reject the promise if there's an error
            });
        });
      });

      // Use Promise.all to wait for all promises to resolve
      Promise.all(promises)
        .then((updatedResults) => {
          // Handle the updatedResults here
          const leadsCount = query.leadsCount[0]?.count || 0;

          const totalPages = Math.ceil(leadsCount / perPage);
          return res.json({
            data: query.results,
            meta: {
              perPage: perPage,
              page: _req.query.page || 1,
              pages: totalPages,
              total: leadsCount,
            },
          });
        })
        .catch((error) => {
          console.error(error);
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

  static showAllLeadsToAdmin = async (
    _req: any,
    res: Response
  ): Promise<any> => {
    let sortingOrder = _req.query.sortingOrder || sort.DESC;

    const status = _req.query.status;
    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
    const perPage =
      _req.query && _req.query.perPage > 0
        ? parseInt(_req.query.perPage)
        : LIMIT;
    let skip =
      (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) *
      perPage;
    try {
      // let dataToFind: any = { status: { $nin: [leadsStatusEnums.ARCHIVED] } };
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
      if (status) {
        dataToFind = { status: status };
      }
      if (_req.query.industryId) {
        dataToFind.industryId = new ObjectId(_req.query.industryId);
      }
      let bids: string[] = [];
      if (_req.query.accountManagerId != "" && _req.query.accountManagerId) {
        const users = await User.find({
          accountManager: _req.query.accountManagerId,
        });
        users.map((user: UserInterface) => {
          return bids.push(user.buyerId);
        });
      }
      if (_req.query.accountManagerId) {
        dataToFind.bid = { $in: bids };
      }
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            { invalidLeadReason: { $regex: _req.query.search, $options: "i" } },
            { leadRemarks: { $regex: _req.query.search, $options: "i" } },
            { feedbackForNMG: { $regex: _req.query.search, $options: "i" } },
            { clientNotes: { $regex: _req.query.search, $options: "i" } },
            { bid: { $regex: _req.query.search, $options: "i" } },
            { status: { $regex: _req.query.search, $options: "i" } },
            { "leads.email": { $regex: _req.query.search, $options: "i" } },
            { "leads.firstname": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastname": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        // skip = 0;
      }
      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        const users = await User.find({
          accountManager: _req.user._id,
        });
        users.map((user: UserInterface) => {
          return bids.push(user.buyerId);
        });
        dataToFind.bid = { $in: bids };
      }
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
              {
                $lookup: {
                  from: "users", // Replace with the actual name of your "BusinessDetails" collection
                  localField: "clientName.accountManager",
                  foreignField: "_id",
                  as: "accountManager",
                },
              },
              // {
              //   $unwind: "$accountManager",
              // },
              { $sort: { createdAt: sortingOrder } },

              { $skip: skip },
              { $limit: perPage },

              // { $sort: { rowIndex: 1 } },
              {
                $project: {
                  feedbackForNMG: 0,
                  clientNotes1: 0,
                  clientNotes2: 0,
                  clientNotes3: 0,
                  bid: 0,
                  leadsCost: 0,
                  updatedAt: 0,

                  "leads.c1": 0,
                  "clientName.password": 0,
                  "clientName.autoCharge": 0,
                  "clientName.leadCost": 0,
                  "clientName.isRyftCustomer": 0,
                  "clientName.isArchived": 0,
                  "clientName.isLeadbyteCustomer": 0,
                  "clientName.autoChargeAmount": 0,
                  "clientName.verifiedAt": 0,
                  "clientName.isVerified": 0,
                  "clientName.isActive": 0,
                  // "clientName.businessDetailsId": 0,
                  "clientName.userLeadsDetailsId": 0,
                  "clientName.onBoarding": 0,
                  "clientName.registrationMailSentToAdmin": 0,
                  "clientName.createdAt": 0,
                  "clientName.activatedAt": 0,
                  "clientName.isDeleted": 0,
                  "clientName.invitedById": 0,
                  "clientName.__v": 0,
                  "clientName.buyerId": 0,
                  "clientName.role": 0,
                  "clientName.permissions": 0,
                  "accountManager.password": 0,
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      const promises = query.results.map((item: any) => {
        if (!item["clientName"][0]?.deletedAt) {
          item.leads.clientName =
            item["clientName"][0]?.firstName +
            " " +
            item["clientName"][0]?.lastName;

          item.leads.accountManager =
            (item["accountManager"][0]?.firstName || "") +
            " " +
            (item["accountManager"][0]?.lastName || "");
        } else {
          item.leads.clientName = "Deleted User";
        }
        item.leads.businessName = "Deleted";
        item.leads.businessIndustry = "Deleted";
        item.leads.status = item?.status;
        const columnMapping: Record<string, string> = {};

        BuisnessIndustries.findById(
          item["clientName"][0]?.businessIndustryId
        ).then((industry) => {
          industry?.columns.map((column: columnsObjects) => {
            if (
              column.displayName &&
              column.originalName &&
              column.isVisible === true
            ) {
              columnMapping[column.displayName] = column.originalName;
            }
          });
          for (const displayName in columnMapping) {
            const originalName = columnMapping[displayName];
            const leads = item.leads;
            if (leads.hasOwnProperty(originalName)) {
              leads[originalName] = leads[originalName];
            } else {
              leads[originalName] = "";
            }
          }
          // item.columns = industry?.columns;
        });
        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then(async (businesss) => {
              if (businesss) {
                item.leads.businessName = businesss?.businessName;
                item.leads.businessIndustry = businesss?.businessIndustry;
              } else {
                item.leads.businessName = "Deleted";
                item.leads.businessIndustry = "Deleted";
              }
              const industry = await BuisnessIndustries.findOne({
                industry: businesss?.businessIndustry,
              });

              item.columns = industry?.columns ?? [];
              resolve(item); // Resolve the promise with the modified item
            })
            .catch((error) => {
              console.log("err", error, new Date(), "Today's Date");
              // item.leads.businessName = "Deleted";
              // item.leads.businessIndustry = "Deleted";
              reject(error); // Reject the promise if there's an error
            });
        });
      });

      Promise.all(promises)
        .then((updatedResults) => {
          // Handle the updatedResults here
          const leadsCount = query.leadsCount[0]?.count || 0;

          const totalPages = Math.ceil(leadsCount / perPage);
          return res.json({
            data: query.results,
            meta: {
              perPage: perPage,
              page: _req.query.page || 1,
              pages: totalPages,
              total: leadsCount,
            },
          });
        })
        .catch((error) => {
          console.error(error);
        });
      // })
      // .catch((error) => {
      //   console.error(error);
      // });
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static createPreference = async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user?._id;
    const input = req.body;
    try {
      const checkExist = await LeadTablePreference.findOne({ userId: userId });

      if (!checkExist) {
        //@ts-ignore
        const columns = input?.columns.sort((a, b) => a.index - b.index);
        let dataToSave: any = {
          userId: userId,
          columns,
        };
        const Preference = await LeadTablePreference.create(dataToSave);
        return res.json({ data: Preference });
      } else {
        const data = await LeadTablePreference.findByIdAndUpdate(
          checkExist._id,
          { columns: input.columns },
          { new: true }
        ).lean();
        //@ts-ignore
        const col = data?.columns.sort((a, b) => a.index - b.index);
        return res.json({ data: { ...data, columns: col } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static showPreference = async (req: Request, res: Response) => {
    //@ts-ignore
    const userId = req.user?._id;
    try {
      const preference = await LeadTablePreference.findOne({ userId: userId });
      let data;
      if (!preference || preference.columns.length === 0) {
        const user = await User.findById(userId);
        const industry = await BuisnessIndustries.findById(
          user?.businessIndustryId
        );
        // data = industry?.columns;
        data = await LeadTablePreference.create({
          userId: userId,
          columns: industry?.columns,
        });
      } else {
        data = preference;
      }
      return res.json({ data: data });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong" } });
    }
  };

  static generateInvoicePdf = async (_req: Request, res: Response) => {
    const user = _req.user;
    const { invoiceID } = _req.params;
    refreshToken().then(async () => {
      const invoices = await Invoice.findOne({
        //@ts-ignore
        userId: user?.id,
        invoiceId: invoiceID,
      });
      if (!invoices) {
        return res.status(400).json({
          data: { message: "you don't have access to generate this pdf" },
        });
      }
      const token = await AccessToken.findOne();
      const options = {
        method: "GET",
        hostname: process.env.XERO_HOST_NAME,
        path: `${process.env.INVOICE_URL}${invoiceID}`,
        headers: {
          "xero-tenant-id": process.env.XERO_TETANT_ID,
          // "xero-tenant-id": "f3d6705e-2e71-437f-807f-5d0893c0285b",

          Authorization: "Bearer " + token?.access_token,
          Accept: "application/pdf",
          "Content-Type": "application/json",
        },
        maxRedirects: 20,
      };
      const pdfRequest = await https.https.request(
        options,
        function (apiResponse: any) {
          if (apiResponse.rawHeaders.includes("Bearer error=invalid_token")) {
            refreshToken().then(() => {
              LeadsController.generateInvoicePdf(_req, res);
            });
          }
          let chunks: any = [];
          apiResponse.on("data", function (chunk: any) {
            chunks.push(chunk);
          });
          apiResponse.on("end", function (chunk: any) {
            const buffer = Buffer.concat(chunks);
            const path = `${process.cwd()}/public/invoice-pdf/${invoiceID}.pdf`;
            fs.open(path, "w", function (err: any, fd: any) {
              if (err) {
                throw "error opening file: " + err;
              }
              fs.write(fd, buffer, 0, buffer.length, null, function (err: any) {
                if (err) throw "error writing file: " + err;
                fs.close(fd, function () {});
              });
            });
          });
          apiResponse.on("error", function (error: any) {
            console.error(error);
          });
        }
      );
      pdfRequest.end();
      http: return res.json({
        path: path.join(`${FileEnum.INVOICE_PDF}${invoiceID}.pdf`),
      });
    });
    function deleteFile() {
      DeleteFile(path.join(`${FileEnum.INVOICE_PDF}${invoiceID}.pdf`));
      return "deleted";
    }
    setTimeout(deleteFile, 300000);
  };

  static dashboardTopThreeCards = async (
    _req: any,
    res: Response
  ): Promise<Response> => {
    const id = _req.user?.id;
    try {
      const user = await User.findById(id);
      const today = new Date(
        new Date(
          new Date(
            new Date().getTime() - new Date().getTimezoneOffset() * 60000
          )
        )
          .toISOString()
          .split("T")[0]
      );
      const a = new Date(new Date().setDate(new Date().getDate() - 1));
      // const aa = new Date(new Date().setDate(new Date().getDate() - 2));
      const b = new Date(new Date().setDate(new Date().getDate() - 7));
      const c = new Date(new Date().setDate(new Date().getDate() - 14));
      const d = new Date(new Date().setDate(new Date().getDate() - 30));
      const dd = new Date(new Date().setDate(new Date().getDate() - 60));
      const e = new Date(new Date().setDate(new Date().getDate() - 90));
      const ee = new Date(new Date().setDate(new Date().getDate() - 180));

      const yesterday = new Date(
        new Date(new Date(a.getTime() - a.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );

      const lastWeek = new Date(
        new Date(new Date(b.getTime() - b.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );
      const lastToLastWeek = new Date(
        new Date(new Date(c.getTime() - c.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );
      const beforeOneMonthDate = new Date(
        new Date(new Date(d.getTime() - d.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );
      const beforeTwoMonthDate = new Date(
        new Date(new Date(dd.getTime() - dd.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );
      const beforeThreeMonthDate = new Date(
        new Date(new Date(e.getTime() - e.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );
      const beforeSixMonthDate = new Date(
        new Date(new Date(ee.getTime() - ee.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );
      const todayData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(today),
        },
      });

      const yesterdayData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(yesterday),
          $lte: new Date(today),
        },
      });

      const lastWeekData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(lastWeek),
          $lte: new Date(today),
        },
      });

      const lastToLastWeekData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(lastToLastWeek),
          $lte: new Date(lastWeek),
        },
      });
      const currentMonthData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(beforeOneMonthDate),
          $lte: new Date(today),
        },
      });
      const beforeOneMonthData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(beforeTwoMonthDate),
          $lte: new Date(beforeOneMonthDate),
        },
      });

      const beforeThreeMonthData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(beforeThreeMonthDate),
          $lte: new Date(today),
        },
      });

      const beforeSixMonthData = await Leads.find({
        bid: user?.buyerId,
        createdAt: {
          $gte: new Date(beforeSixMonthDate),
          $lte: new Date(beforeThreeMonthDate),
        },
      });
      //@ts-ignore
      function percentage(a, b) {
        let result = Math.floor(((a - b) * 100) / a + b);
        //@ts-ignore
        if (result == "-Infinity") {
          result = -100;
        }
        return result;
      }

      const todayPercentage = percentage(
        todayData.length,
        yesterdayData.length
      );
      // const yesterdayPercentage = percentage(
      //   yesterdayData.length,
      //   dayBeforeYesterdayData.length
      // );
      const pastWeekPercentage = percentage(
        lastWeekData.length,
        lastToLastWeekData.length
      );

      const monthlyPercentage = percentage(
        currentMonthData.length,
        beforeOneMonthData.length
      );

      const quarterlyPercentage = percentage(
        beforeThreeMonthData.length,
        beforeSixMonthData.length
      );
      return res.json({
        data: {
          todayData: todayData.length,
          // yesterdayData: yesterdayData.length,
          lastWeekData: lastWeekData.length,
          monthlyData: currentMonthData.length,
          quarterlyData: beforeThreeMonthData.length,
          todayPercentage: todayPercentage,
          // yesterdayPercentage: yesterdayPercentage,
          pastWeekPercentage: pastWeekPercentage,
          monthlyPercentage: monthlyPercentage,
          quarterlyPercentage: quarterlyPercentage,
        },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  //clubbed  rightdashboard chart and leftdashboard chart
  static dashboardMiddleCharts = async (
    _req: Request,
    res: Response
  ): Promise<Response> => {
    //@ts-ignore
    const id = _req.user.id;
    const user = await User.findById(id);
    const start: any = _req.query.start;
    const end: any = _req.query.end;
    const newEnd = new Date(end).setDate(new Date(end).getDate() + 1);
    let dataToFind: any = { bid: user?.buyerId };
    if (start) {
      dataToFind = {
        ...dataToFind,
        createdAt: {
          ...dataToFind.createdAt,
          $gte: new Date(start),
        },
      };
    }
    if (end) {
      dataToFind = {
        ...dataToFind,
        createdAt: {
          ...dataToFind.createdAt,
          $lte: new Date(newEnd),
        },
      };
    }

    try {
      //@ts-ignore
      if (_req.user?.role == RolesEnum["ADMIN"]) {
        const leads = await Leads.aggregate([
          {
            $facet: {
              results: [
                {
                  $match: {
                    createdAt: {
                      $gte: new Date(start),
                      $lte: new Date(newEnd),
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      // $month: "$createdAt",
                      date: { $dayOfMonth: "$createdAt" },
                      month: { $month: "$createdAt" },
                      year: { $year: "$createdAt" },
                    },
                    total: {
                      $sum: "$leadsCost",
                    },
                    count: { $sum: 1 },
                  },
                },
              ],
            },
          },
        ]);
        if (leads) {
          let array: {}[] = [];
          leads[0].results.forEach((lead: any) => {
            let obj: any = {};
            obj.date = lead._id.date;
            obj.month = lead._id.month;
            obj.year = lead._id.year;
            obj.total = lead.total;
            obj.count = lead.count;
            array.push(obj);
          });
          return res.json({ data: array });
        }
      }
      const leads = await Leads.aggregate([
        {
          $facet: {
            results: [
              {
                $match: dataToFind,
              },
              {
                $group: {
                  _id: {
                    date: { $dayOfMonth: "$createdAt" },
                    month: { $month: "$createdAt" },
                    year: { $year: "$createdAt" },
                  },
                  total: {
                    $sum: "$leadsCost",
                  },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]);

      if (leads) {
        let array: {}[] = [];
        leads[0].results.forEach((i: any) => {
          let obj: any = {};
          obj.date = i._id.date;
          obj.month = i._id.month;
          obj.year = i._id.year;
          obj.total = i.total;
          obj.count = i.count;
          array.push(obj);
        });
        return res.json({ data: array });
      }

      return res.status(404).json({ error: { message: "leads not found." } });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static exportCsvFileUserLeads = async (_req: any, res: Response) => {
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    const userId = _req.user?.id;
    const status = _req.query.status;
    let accountManager = _req.query.accountManagerId;
    let industry = _req.query.industry;

    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
    try {
      let dataToFind: any = {
        // $or: [
        //   {
        status: {
          $in: [
            leadsStatusEnums.REPORTED,
            leadsStatusEnums.REPORT_ACCEPTED,
            leadsStatusEnums.REPORT_REJECTED,
            leadsStatusEnums.ARCHIVED,
            leadsStatusEnums.VALID,
          ],
        },
        //   },
        // ],
      };
      if (industry) {
        let bids: any = [];
        const users = await User.find({ businessIndustryId: industry });
        users.map((user) => {
          return bids.push(user.buyerId);
        });
        dataToFind.bid = { $in: bids };
      }

      if (accountManager) {
        let bids: any = [];
        const users = await User.find({
          accountManager: new ObjectId(accountManager),
        });
        users.map((user) => {
          return bids.push(user.buyerId);
        });
        dataToFind.bid = { $in: bids };
      }
      const user = await User.findById(userId);
      if (user?.role == RolesEnum.INVITED) {
        const invitedBy = await User.findOne({ _id: user?.invitedById });
        dataToFind.bid = invitedBy?.buyerId;
      } else {
        dataToFind.bid = user?.buyerId;
      }
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            { invalidLeadReason: { $regex: _req.query.search, $options: "i" } },
            { clientNotes: { $regex: _req.query.search, $options: "i" } },
            { bid: { $regex: _req.query.search, $options: "i" } },
            { status: { $regex: _req.query.search, $options: "i" } },
            { "leads.email": { $regex: _req.query.search, $options: "i" } },
            { "leads.firstname": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastname": { $regex: _req.query.search, $options: "i" } },
            { "leads.phone1": { $regex: _req.query.search, $options: "i" } },
          ],
        };
      }
      if (status) {
        dataToFind.status = status;
      }
      if (_req.query.file === leadsStatusEnums.REPORTED) {
        dataToFind.status = {
          $in: [
            leadsStatusEnums.REPORTED,
            leadsStatusEnums.REPORT_ACCEPTED,
            leadsStatusEnums.REPORT_REJECTED,
            leadsStatusEnums.ARCHIVED,
          ],
        };
      }

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
                  bid: 0,
                  updatedAt: 0,
                  "leads.c1": 0,
                },
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
      const pref = await BuisnessIndustries.findById(user?.businessIndustryId);
      let filteredDataArray: DataObject[];
      if (!pref) {
        filteredDataArray = [{}];
      } else {
        filteredDataArray = filterAndTransformData(
          //@ts-ignore
          pref?.columns,
          convertArray(query.results)
        );
      }

      const resultArray = filteredDataArray.map((obj) => {
        const newObj: Record<string, string> = {};
        for (const key in obj) {
          if (key !== "Received") {
            newObj[key] = obj[key] === undefined ? "" : obj[key];
          }
        }
        return newObj;
      });
      return res.json({
        data: resultArray,
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

  static exportCsvFileAdminLeads = async (_req: any, res: Response) => {
    const status = _req.query.status;
    let id = _req.query.id;
    let industry = _req.query.industry;
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    let accountManager = _req.query.accountManagerId;

    if (sortingOrder == sort.ASC) {
      sortingOrder = 1;
    } else {
      sortingOrder = -1;
    }
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
      if (id) {
        const user = await User.findById(id);
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
      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        let bids: any = [];
        const users = await User.find({ accountManager: _req.user._id });
        users.map((user) => {
          return bids.push(user.buyerId);
        });
        dataToFind.bid = { $in: bids };
      }
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            { invalidLeadReason: { $regex: _req.query.search, $options: "i" } },
            { clientNotes: { $regex: _req.query.search, $options: "i" } },
            { bid: { $regex: _req.query.search, $options: "i" } },
            { status: { $regex: _req.query.search, $options: "i" } },
            { "leads.email": { $regex: _req.query.search, $options: "i" } },
            { "leads.firstName": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastName": { $regex: _req.query.search, $options: "i" } },
            { "leads.phone": { $regex: _req.query.search, $options: "i" } },
            { "leads.address": { $regex: _req.query.search, $options: "i" } },
          ],
        };
      }
      if (status) {
        dataToFind.status = status;
      }
      if (accountManager) {
        let bids: any = [];
        const users = await User.find({
          accountManager: new ObjectId(accountManager),
        });
        users.map((user) => {
          return bids.push(user.buyerId);
        });
        dataToFind.bid = { $in: bids };
      }
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
      // const pref: LeadTablePreferenceInterface | null =
      //   await LeadTablePreference.findOne({ userId: _req.user.id });

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
      const filteredDataArray: DataObject[] = filterAndTransformData(
        //@ts-ignore
        pref[0]?.columns,
        convertArray(query.results)
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
      return res.json({
        data: resultArray,
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

  static leadsStat = async (_req: any, res: Response) => {
    try {
      let dataToFindForValid: Record<
        string,
        string | Types.ObjectId | string[] | BidFilter
      > = {
        status: leadsStatusEnums.VALID,
      };
      let dataToFindForReported: Record<
        string,
        string | Types.ObjectId | string[] | BidFilter
      > = {
        status: leadsStatusEnums.REPORTED,
      };
      let dataToFindForReportAccepted: Record<
        string,
        string | Types.ObjectId | string[] | BidFilter
      > = {
        status: leadsStatusEnums.REPORT_ACCEPTED,
      };
      let dataToFindForReportRejected: Record<
        string,
        string | Types.ObjectId | string[] | BidFilter
      > = {
        status: leadsStatusEnums.REPORT_REJECTED,
      };
      if (_req.user.role === RolesEnum.ACCOUNT_MANAGER) {
        let bids: string[] = [];
        const users = await User.find({
          accountManager: _req.user._id,
        });
        users.map((user: UserInterface) => {
          return bids.push(user.buyerId);
        });
        dataToFindForReportAccepted.bid = { $in: bids };
        dataToFindForReportRejected.bid = { $in: bids };
        dataToFindForReported.bid = { $in: bids };
        dataToFindForValid.bid = { $in: bids };
      }

      if (_req.user.role === RolesEnum.USER) {
        let bids: string[] = [];
        const users =
          (await User.findById(_req.user._id)) ?? ({} as UserInterface);
        bids.push(users?.buyerId);
        dataToFindForReportAccepted.bid = { $in: bids };
        dataToFindForReportRejected.bid = { $in: bids };
        dataToFindForReported.bid = { $in: bids };
        dataToFindForValid.bid = { $in: bids };
      }

      if (_req.user.role === RolesEnum.INVITED) {
        let bids: string[] = [];
        const user =
          (await User.findById(_req.user._id)) ?? ({} as UserInterface);
        const users =
          (await User.findById(user.invitedById)) ?? ({} as UserInterface);
        bids.push(users?.buyerId);
        dataToFindForReportAccepted.bid = { $in: bids };
        dataToFindForReportRejected.bid = { $in: bids };
        dataToFindForReported.bid = { $in: bids };
        dataToFindForValid.bid = { $in: bids };
      }

      const valid = await Leads.find(dataToFindForValid).count();
      const reported = await Leads.find(dataToFindForReported).count();
      const reportAccepted = await Leads.find(
        dataToFindForReportAccepted
      ).count();
      const reportRejected = await Leads.find(
        dataToFindForReportRejected
      ).count();
      const dataToShow = {
        validLeads: valid,
        reportedLeads: reported,
        reportAcceptedLeads: reportAccepted,
        reportRejectedLeads: reportRejected,
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

// Function to filter and transform the data
function filterAndTransformData(
  columns: Column[],
  dataArray: DataObject[]
): DataObject[] {
  return dataArray.map((dataObj: DataObject) => {
    const filteredData: DataObject = {};
    columns.forEach((column: Column) => {
      if (column.isVisible) {
        filteredData[column.displayName || column.originalName] =
          dataObj[column.originalName];
      }
    });
    return filteredData;
  });
}
