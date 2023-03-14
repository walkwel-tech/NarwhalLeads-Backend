import { Request, Response } from "express";
import path from "path";
const fs = require("fs");
// import mongoose from "mongoose";
import { RolesEnum } from "../../types/RolesEnum";
import { leadsStatusEnums } from "../../utils/Enums/leads.status.enum";
import { addCreditsToBuyer } from "../../utils/payment/addBuyerCredit";
import { AdminSettings } from "../Models/AdminSettings";
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
  send_email_for_lead_status,
  send_email_for_new_lead,
  send_email_for_new_lead_to_admin,
} from "../Middlewares/mail";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
import { preference } from "../../utils/constantFiles/leadPreferenecColumns";
import { sort } from "../../utils/Enums/sorting.enum";
const LIMIT = 10;

export class LeadsController {
  static create = async (req: Request, res: Response) => {
    const bid = req.params.id;
    const givenLeadByteKey = req.body.c1;
    const adminSettings = await AdminSettings.findOne();
    if (!givenLeadByteKey) {
      return res
        .status(401)
        .json({ err: { message: "Please insert Leadbyte secret key" } });
    }
    if (adminSettings?.leadByteKey != givenLeadByteKey) {
      return res
        .status(401)
        .json({ err: { message: "Incorrect Leadbyte secret key" } });
    }

    const input = req.body;
    const user: any = await User.findOne({ buyerId: bid }).populate(
      "userLeadsDetailsId"
    );

    const leads = await Leads.findOne({ bid: user?.buyerId })
      .sort({ rowIndex: -1 })
      .limit(1);

    const checkPreferenceExists: any = await LeadTablePreference.findOne({
      userId: user._id,
    });
    if (!checkPreferenceExists) {
      let array = preference;

      Object.keys(input).map((i: any) => {
        let obj: any = {};

        if (i != "c1") {
          (obj.name = i),
            (obj.isVisible = false),
            (obj.index = array[array?.length - 1]?.index + 1 || 0);
          array.push(obj);
        }
      });

      const dataToSaveInLeadsPreference: any = {
        userId: user.id,
        columns: array,
      };

      await LeadTablePreference.create(dataToSaveInLeadsPreference);
      const admin = await User.findOne({ role: RolesEnum.ADMIN });
      const adminPref: any = await LeadTablePreference.findOne({
        userId: admin?._id,
      });
      let key = Object.keys(input).map((i) => i);
      key.forEach((item, idx) => {
        const existingElement = adminPref?.columns.find(
          (resElement: any) => resElement.name === item
        );
        if (!existingElement && item != "c1") {
          adminPref?.columns.push({
            name: item,
            isVisible: false,
            index: adminPref?.columns.length,
          });
        }
      });
      await LeadTablePreference.updateOne(
        { userId: admin?._id },
        {
          columns: adminPref?.columns,
        }
      );
    }
    let key = Object.keys(input).map((i) => i);
    key.forEach((item, idx) => {
      const existingElement = checkPreferenceExists?.columns.find(
        (resElement: any) => resElement.name === item
      );
      if (!existingElement && item != "c1") {
        checkPreferenceExists?.columns.push({
          name: item,
          isVisible: false,
          index: checkPreferenceExists?.columns.length,
        });
      }
    });
    const admin = await User.findOne({ role: RolesEnum.ADMIN });
    await LeadTablePreference.updateOne(
      { userId: admin?._id },
      {
        columns: checkPreferenceExists?.columns,
      }
    );

    await LeadTablePreference.findByIdAndUpdate(checkPreferenceExists?.id, {
      columns: checkPreferenceExists?.columns,
    });

    const leadsSave = await Leads.create({
      bid: bid,
      leadsCost: user.leadCost,
      leads: input,
      status: leadsStatusEnums.VALID,
      // @ts-ignore
      rowIndex: leads?.rowIndex + 1 || 0,
    });
    const cardDetails = await CardDetails.findOne({
      userId: user._id,
      isDefault: true,
      isDeleted: false,
    });
    if (cardDetails) {
      const credits = user?.credits;
      const leftCredits = credits - user?.leadCost;
      await User.findByIdAndUpdate(user?.id, { credits: leftCredits });
      const dataToSave: any = {
        userId: user.id,
        cardId: cardDetails?.id,
        isDebited: true,
        title: transactionTitle.NEW_LEAD,
        amount: user.leadCost,
        status: "success",
      };
      await Transaction.create(dataToSave);
    } else {
      return res
        .status(404)
        .json({ error: { message: "Card details not found" } });
    }
    if (
      user.userLeadsDetailsId?.leadAlertsFrequency == leadsAlertsEnums.INSTANT
    ) {
      let arr: any = [];
      Object.keys(input).forEach((i) => {
        if (i != "c1") {
          let obj: any = {};
          obj.keys = i;
          obj.values = input[i];
          arr.push(obj);
        }
      });
      const message: any = {
        bid: bid,
        leadCost: user.leadCost,
        firstName: user.firstName,
        cardNumber: cardDetails?.cardNumber?.substr(-4),
        message: arr,
      };
      send_email_for_new_lead(user.email, message);
      const messageToAdmin: any = {
        leadsCost: user.leadCost,
        email: user.email,
        cardNumber: cardDetails?.cardNumber?.substr(-4),
      };
      send_email_for_new_lead_to_admin(messageToAdmin);
    }

    return res.json({ data: leadsSave });
  };

  static update = async (req: Request, res: Response): Promise<any> => {
    const leadId = req.params.id;
    const input = req.body;
    const lead = await Leads.findById(leadId);
    try {
      if (
        lead?.status == leadsStatusEnums.REPORT_ACCEPTED ||
        lead?.status == leadsStatusEnums.REPORT_REJECTED
      ) {
        return res
          .status(400)
          .json({ error: { message: "You can not update the status." } });
      }
      if (
        //@ts-ignore
        req.user?.role == RolesEnum.USER &&
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
          { status: leadsStatusEnums.VALID },
          { new: true }
        );
      }
      if (
        input?.invalidLeadReason &&
        input?.invalidLeadReason != "Select Option"
      ) {
        await Leads.findByIdAndUpdate(
          leadId,
          { status: leadsStatusEnums.REPORTED, reportedAt: new Date() },
          { new: true }
        );
      }
      if (
        lead?.status != leadsStatusEnums.REPORTED &&
        //@ts-ignore
        req.user.role === RolesEnum.ADMIN &&
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
        //@ts-ignore
        req.user.role === RolesEnum.ADMIN &&
        input.status == leadsStatusEnums.REPORT_REJECTED
      ) {
        const leadUser: any = await User.findOne({ buyerId: lead?.bid });

        const message: any = { name: leadUser.firstName, status: "Rejected" };
        send_email_for_lead_status(leadUser?.email, message);
        const leadsUpdate = await Leads.findByIdAndUpdate(
          leadId,
          { ...input, reportRejectedAt: new Date() },
          { new: true }
        );
        return res.json({ data: leadsUpdate });
      }
      if (
        //@ts-ignore
        req.user.role === RolesEnum.ADMIN &&
        input.status == leadsStatusEnums.REPORT_ACCEPTED
      ) {
        const user = await User.findOne({ buyerId: lead?.bid });
        const card = await CardDetails.findOne({
          userId: user?.id,
          isDefault: true,
        });
        const payment: any = {
          buyerId: lead?.bid,
          fixedAmount: lead?.leadsCost,
          freeCredits: 0,
        };
        const leadUser: any = await User.findOne({ buyerId: lead?.bid });

        const message: any = { name: leadUser.firstName, status: "Approved" };
        send_email_for_lead_status(leadUser?.email, message);
        addCreditsToBuyer(payment)
          .then(async () => {
            const dataToSave: any = {
              userId: user?.id,
              cardId: card?.id,
              amount: lead?.leadsCost,
              title: transactionTitle.LEAD_REJECTION_APPROVED,
              isCredited: true,
              status: "success",
            };
            await Transaction.create(dataToSave);
            const leadsUpdate = await Leads.findByIdAndUpdate(
              leadId,
              { ...input, reportAcceptedAt: new Date() },
              { new: true }
            );
            return res.json({ data: leadsUpdate });
          })
          .catch(async (err) => {
            console.log("ERROR IN ADDING CREDITS", err);
            const dataToSave: any = {
              userId: user?.id,
              cardId: card?.id,
              amount: lead?.leadsCost,
              title: transactionTitle.LEAD_REJECTION_APPROVED,
              isCredited: true,
              status: "error",
            };
            await Transaction.create(dataToSave);
          });
      } else {
        const leadsUpdate = await Leads.findByIdAndUpdate(
          leadId,
          { ...input },
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
    const id = _req.user?.id;
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
            // { firstName: { $regex: _req.query.search } },
            // { lastName: { $regex: _req.query.search } },
          ],
        };
        skip = 0;
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
            obj.count = i.count;
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
        leads[0].results.forEach((i: any) => {
          let obj: any = {};
          obj.date = i._id.date;
          obj.month = i._id.month;
          obj.year = i._id.year;
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

  static show = async (_req: any, res: Response) => {
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
      if (user?.credits == 0 && user?.role == RolesEnum.USER) {
        return res
          .status(200)
          .json({ message: "Insufficient credits!", data: [] });
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
            { "leads.gender": { $regex: _req.query.search, $options: "i" } },
            { "leads.dob": { $regex: _req.query.search, $options: "i" } },
            { "leads.jobtitle": { $regex: _req.query.search, $options: "i" } },
            { "leads.county": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        skip = 0;
      }
      if (status) {
        dataToFind.status = status;
      }
      const [query]: any = await Leads.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
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
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
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
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static showReportedLeads = async (_req: any, res: Response) => {
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
      const user = await User.findById(userId);
      if (user?.credits == 0 && user?.role == RolesEnum.USER) {
        return res
          .status(200)
          .json({ message: "Insufficient credits!", data: [] });
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
            { "leads.gender": { $regex: _req.query.search, $options: "i" } },
            { "leads.dob": { $regex: _req.query.search, $options: "i" } },
            { "leads.jobtitle": { $regex: _req.query.search, $options: "i" } },
            { "leads.county": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        skip = 0;
      }
      if (status) {
        // dataToFind.status = status;
        dataToFind = { status: status };
      }
      const [query]: any = await Leads.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
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
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
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
      input.forEach(async (i: { _id: any; rowIndex: any }) => {
        await Leads.findByIdAndUpdate(
          { _id: i._id },
          { rowIndex: i.rowIndex },
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

  static showAllLeadsToAdminByUserId = async (_req: any, res: Response) => {
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
      const user = await User.findById(userId);
      let dataToFind: any = {
        bid: user?.buyerId,
        status: { $nin: [leadsStatusEnums.ARCHIVED] },
      };
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
            { "leads.gender": { $regex: _req.query.search, $options: "i" } },
            { "leads.dob": { $regex: _req.query.search, $options: "i" } },
            { "leads.jobtitle": { $regex: _req.query.search, $options: "i" } },
            { "leads.county": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        skip = 0;
      }
      if (status) {
        dataToFind.status = status;
      }
      const [query]: any = await Leads.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
              { $sort: { createdAt: sortingOrder } },
              { $skip: skip },
              { $limit: perPage },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
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
    } catch (err) {
      return res.status(500).json({
        error: {
          message: "something went wrong",
          err,
        },
      });
    }
  };

  static showAllLeadsToAdmin = async (_req: any, res: Response) => {
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
                // leadsStatusEnums.ARCHIVED,
                leadsStatusEnums.VALID,
              ],
            },
          },
        ],
      };

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
            { "leads.gender": { $regex: _req.query.search, $options: "i" } },
            { "leads.dob": { $regex: _req.query.search, $options: "i" } },
            { "leads.jobtitle": { $regex: _req.query.search, $options: "i" } },
            { "leads.county": { $regex: _req.query.search, $options: "i" } },
          ],
        };
        skip = 0;
      }
      if (status) {
        dataToFind = { status: status };
      }
      const [query]: any = await Leads.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
              { $skip: skip },
              { $limit: perPage },

              // { $sort: { rowIndex: 1 } },
              { $sort: { createdAt: sortingOrder } },
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
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
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
      const Preference = await LeadTablePreference.findOne({ userId: userId });
      if (Preference) {
        return res.json({ data: Preference });
      }
      return res.json({ data: { columns: preference } });
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
          data: { message: "you don't have access to to generate this pdf" },
        });
      }
      const token = await AccessToken.findOne();
      const https = require("follow-redirects").https;
      const options = {
        method: "GET",
        hostname: process.env.XERO_HOST_NAME,
        path: `${process.env.INVOICE_URL}${invoiceID}`,
        headers: {
          "xero-tenant-id": process.env.XERO_TETANT_ID,
          Authorization: "Bearer " + token?.access_token,
          Accept: "application/pdf",
          "Content-Type": "application/json",
        },
        maxRedirects: 20,
      };
      const pdfRequest = await https.request(
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
    const id = _req.user.id;
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

      const yesterday = new Date(
        new Date(new Date(a.getTime() - a.getTimezoneOffset() * 60000))
          .toISOString()
          .split("T")[0]
      );
      // const dayBeforeYesterday = new Date(
      //   new Date(new Date(aa.getTime() - aa.getTimezoneOffset() * 60000))
      //     .toISOString()
      //     .split("T")[0]
      // );
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

      // const dayBeforeYesterdayData = await Leads.find({
      //   bid: user?.buyerId,
      //   createdAt: {
      //     $gte: new Date(dayBeforeYesterday),
      //     $lte: new Date(yesterday),
      //   },
      // });
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
      //@ts-ignore
      function percentage(a, b) {
        let result = Math.floor(((a - b) * 100) / a);
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
      return res.json({
        data: {
          todayData: todayData.length,
          // yesterdayData: yesterdayData.length,
          lastWeekData: lastWeekData.length,
          monthlyData: currentMonthData.length,
          todayPercentage: todayPercentage,
          // yesterdayPercentage: yesterdayPercentage,
          pastWeekPercentage: pastWeekPercentage,
          monthlyPercentage: monthlyPercentage,
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

  static showMyLeads = async (_req: any, res: Response) => {
    const userId = _req.user?.id;
    const status = _req.query.status;
    try {
      let dataToFind: any = { status: { $nin: [leadsStatusEnums.ARCHIVED] } };
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
        };
      }
      if (status) {
        dataToFind.status = status;
      }
      const [query]: any = await Leads.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
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
      return res.json({
        data: convertArray(query.results),
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

  static showAllLeadsForAdmin = async (_req: any, res: Response) => {
    const status = _req.query.status;
    try {
      let dataToFind: any = { status: { $nin: [leadsStatusEnums.ARCHIVED] } };
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
        };
      }
      if (status) {
        dataToFind.status = status;
      }
      const [query]: any = await Leads.aggregate([
        {
          $facet: {
            results: [
              { $match: dataToFind },
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
      return res.json({
        data: convertArray(query.results),
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
}
function convertArray(arr:any) {
  return arr.map((obj:any) => {
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
