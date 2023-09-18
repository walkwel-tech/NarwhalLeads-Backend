import { Request, Response } from "express";
import path from "path";
const fs = require("fs");
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
  send_email_for_below_5_leads_pending,
  send_email_for_lead_status_accept,
  send_email_for_lead_status_reject,
  send_email_for_new_lead,
} from "../Middlewares/mail";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";
import { leadsAlertsEnums } from "../../utils/Enums/leads.Alerts.enum";
// import { preference } from "../../utils/constantFiles/leadPreferenecColumns";
import { sort } from "../../utils/Enums/sorting.enum";
import { send_lead_data_to_zap } from "../../utils/webhookUrls/send_data_zap";
import { IP } from "../../utils/constantFiles/IP_Lists";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { LeadTablePreferenceInterface } from "../../types/LeadTablePreferenceInterface";
import { Column } from "../../types/ColumnsPreferenceInterface";
import mongoose from "mongoose";
import { PREMIUM_PROMOLINK } from "../../utils/constantFiles/spotDif.offers.promoLink";
import { Notifications } from "../Models/Notifications";
import { BusinessDetails } from "../Models/BusinessDetails";
import { notify } from "../../utils/notifications/leadNotificationToUser";
import { APP_ENV } from "../../utils/Enums/serverModes.enum";
const ObjectId = mongoose.Types.ObjectId;

const LIMIT = 10;

interface DataObject {
  [key: string]: any;
}

export class LeadsController {
  static create = async (req: Request, res: Response) => {
  
    if(process.env.APP_ENV===APP_ENV.PRODUCTION){
        //@ts-ignore
      if (!IP.IP.includes(req?.headers["x-forwarded-for"])) {
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
    const user: any = await User.findOne({ buyerId: bid })
      .populate("userLeadsDetailsId")
      .populate("businessDetailsId");
    if (!user.isLeadReceived) {
      await User.findByIdAndUpdate(user.id, { isLeadReceived: true });
    }
    if (user?.credits == 0 && user?.role == RolesEnum.USER) {
        return res
          .status(400)
          .json({ error: {message:"Insufficient Credits"} });
      }
      const today = new Date();
      const endOfDay = new Date(today);
      endOfDay.setDate(today.getDate() + 1);
      today.setUTCHours(0, 0, 0, 0);
      endOfDay.setUTCHours(0, 0, 0, 0);
            const previous =await Leads.find({bid: user?.buyerId,createdAt: {
              $gte: today,
              $lt: endOfDay
            }
      } )
      console.log(previous.length,user.userLeadsDetailsId?.daily)
      if(previous.length>=user.userLeadsDetailsId?.daily){
        const debuggingLogs={
          yesterday:today.toUTCString(),
          today:endOfDay.toUTCString(),
          currentServerTime:new Date().toUTCString()
        }
        return res
          .status(400)
          .json({ error: {message:"Daily leads limit exhausted!",logs:debuggingLogs} });
      }
    const leads = await Leads.findOne({ bid: user?.buyerId })
      .sort({ rowIndex: -1 })
      .limit(1);

    const industry = await BuisnessIndustries.findOne({
      industry: user.businessDetailsId.businessIndustry,
    });
if(!industry){
  return res
  .status(404)
  .json({ error: { message: "Your Business Industry has been deleted by admin. please choose anoher industry." } });
}
    const columns = await BuisnessIndustries.findById(industry?.id);
    const array: any = [];
    columns?.columnsNames.map((i) => {
      array.push(i["defaultColumn"]);
    });
    let arr: any = [];

    Object.keys(input).map((j) => {
      if (!array.includes(j)) {
        let obj: any = {};
        obj.defaultColumn = j;
        obj.renamedColumn = "";
        //@ts-ignore
        columns?.columnsNames.push(obj);
      } else {
        // columns?.columnsNames.map((i, idx) => {
        //   //@ts-ignore
        //   if (i?.defaultColumn == j && i?.renamedColumn != "") {
        //     //@ts-ignore
        //     input[i?.renamedColumn] = input[j];
        //     //@ts-ignore
        //     // delete input[j];
        //   }
        // });
      }
    });

    columns?.columnsNames.map((i, idx) => {
      let obj: any = {};
      //@ts-ignore
      if (i.renamedColumn != "") {
        //@ts-ignore
        obj.name = i?.renamedColumn;
        obj.isVisible = true;
        obj.index = idx;
        //@ts-ignore
        obj.newName = i?.renamedColumn;
        arr.push(obj);
      } else {
        //@ts-ignore
        obj.name = i?.defaultColumn;
        obj.isVisible = true;
        obj.index = idx;
        //@ts-ignore
        obj.newName = i?.defaultColumn;
        arr.push(obj);
      }
    });

    await BuisnessIndustries.findByIdAndUpdate(
      industry?.id,
      { columns: arr, columnsNames: columns?.columnsNames },
      { new: true }
    );
    // await CustomColumnNames.findByIdAndUpdate(
    // columns?.id,
    // { columnsNames: columns?.columnsNames },
    // { new: true }
    // );
    const checkPreferenceExists: any = await LeadTablePreference.findOne({
      userId: user._id,
    });
    const admin = await User.findOne({ role: RolesEnum.SUPER_ADMIN });
    const adminPref: any = await LeadTablePreference.findOne({
      userId: admin?._id,
    });

    if (!checkPreferenceExists) {
      const columnsNames = await BuisnessIndustries.findById(
        user.businessIndustryId
      );
      // const columnsNames = await CustomColumnNames.findOne({
      // industryId: user?.businessIndustryId,
      // });
      let array: any = [
        {
          name: "clientName",
          isVisible: true,
          index: 0,
          newName: "clientName",
        },
        {
          name: "businessName",
          isVisible: true,
          index: 1,
          newName: "businessName",
        },
        {
          name: "businessIndustry",
          isVisible: true,
          index: 2,
          newName: "businessIndustry",
        },

      ];
      Object.keys(input).map((i: any) => {
        // columnsNames?.columnsNames.map((j)=>{
        let obj: any = {};
        if (i != "c1") {
          (obj.name = i),
            (obj.isVisible = true),
            (obj.index = array[array?.length - 1]?.index + 1 || 0);
          (obj.newName = i),
            columnsNames?.columnsNames.map((j: any) => {
              if (j?.defaultColumn == i) {
                if (j.renamedColumn?.length != 0) {
                  obj.newName = j.renamedColumn;
                }
              }
            });
          array.push(obj);
        }
      });

      const dataToSaveInLeadsPreference: any = {
        userId: user.id,
        columns: array,
      };

      await LeadTablePreference.create(dataToSaveInLeadsPreference);
      const admin = await User.findOne({ role: RolesEnum.SUPER_ADMIN });


      if (adminPref) {
        let key = Object.keys(input).map((i) => i);
        key.forEach((item, idx) => {
          const existingElement = adminPref?.columns.find(
            (resElement: any) => resElement.name === item
          );
          if (!existingElement && item != "c1") {
            let obj: any = {};
            (obj.name = item),
              (obj.isVisible = false),
              (obj.index = adminPref?.columns.length),
              (obj.newName = item),
              columnsNames?.columnsNames.map((j: any) => {
                if (j?.defaultColumn == item) {
                  if (j.renamedColumn?.length != 0) {
                    obj.newName = j.renamedColumn;
                  }
                }
              });
            adminPref?.columns.push(obj);
          }
        });

        await LeadTablePreference.updateOne(
          { userId: admin?._id },
          {
            columns: adminPref?.columns,
          }
        );
      }
      if (!adminPref) {
        await LeadTablePreference.create({
          userId: admin?._id,
          columns: [{
            name: "clientName",
            isVisible: true,
            index: 0,
            newName: "clientName",
          },
          {
            name: "businessName",
            isVisible: true,
            index: 1,
            newName: "businessName",
          },
          {
            name: "businessIndustry",
            isVisible: true,
            index: 2,
            newName: "businessIndustry",
          }
        ],
        });
      }
    }

    let key = Object.keys(input).map((i) => i);
    const columnsNames = await BuisnessIndustries.findById(
      user.businessIndustryId
    );

    // const columnsNames = await CustomColumnNames.findOne({
    // industryId: user?.businessIndustryId,
    // });
    key.forEach((item, idx) => {
      const existingElement = checkPreferenceExists?.columns.find(
        (resElement: any) => resElement.name === item
      );
      if (!existingElement && item != "c1") {
        let obj: any = {};
        (obj.name = item),
          (obj.isVisible = false),
          (obj.index = checkPreferenceExists?.columns.length),
          (obj.newName = item),
          columnsNames?.columnsNames.map((j: any) => {
            if (j?.defaultColumn == item) {
              if (j.renamedColumn?.length != 0) {
                obj.newName = j.renamedColumn;
              }
            }
          });
        checkPreferenceExists?.columns.push(obj);
      }
    });
    checkPreferenceExists?.columns.map((i: any) => {
      //todo: add object for clinet names
      const existingElement = checkPreferenceExists?.columns.find(
        (resElement: any) => resElement.name === "clientName"
      );
      if (!existingElement) {
        let obj = {
          name: "clientName",
          isVisible: true,
          index: checkPreferenceExists?.columns.length,
          newName: "clientName",
        };
        checkPreferenceExists?.columns.push(obj);
      }
      const existingElementBusinessName = checkPreferenceExists?.columns.find(
        (resElement: any) => resElement.name === "businessName"
      );
      if (!existingElementBusinessName) {
        let obj = {
          name: "businessName",
          isVisible: true,
          index: checkPreferenceExists?.columns.length,
          newName: "businessName",
        };
        checkPreferenceExists?.columns.push(obj);
      }
    });

    if (adminPref) {
      await LeadTablePreference.findOneAndUpdate(
        { userId: admin?._id },
        { columns: checkPreferenceExists?.columns }
      );
    } else {
      await LeadTablePreference.create({
        userId: admin?._id,
        columns: checkPreferenceExists?.columns,
      });
    }
    await LeadTablePreference.findByIdAndUpdate(checkPreferenceExists?.id, {
      columns: checkPreferenceExists?.columns,
    });
    
    const leadsSave = await Leads.create({
      bid: bid,
      leadsCost: user.leadCost,
      leads: input,
      status: leadsStatusEnums.VALID,
      industryId: user.businessIndustryId,
      // @ts-ignore
      rowIndex: leads?.rowIndex + 1 || 0,
    });

if(user.isSmsNotificationActive){
  const dataToSent={
    name:input.firstname+ " " +input.lastname,
    email:input.email,
    phoneNumber:input.phone1
  }
  notify(user.smsPhoneNumber, dataToSent)
}
    if (user?.userLeadsDetailsId?.sendDataToZapier) {
      send_lead_data_to_zap(user.userLeadsDetailsId.zapierUrl, input)
        .then((res) => {        })
        .catch((err) => {
        });
    }
    let leadcpl;
    const cardDetails = await CardDetails.findOne({
      userId: user._id,
      isDefault: true,
      isDeleted: false,
    });
    if (cardDetails) {
      const credits = user?.credits;
      let leftCredits;
      if (user.isLeadCostCheck) {

        leadcpl = user.leadCost;
        leftCredits = credits - user?.leadCost;
       
      } else {
        const industry: any = await BuisnessIndustries.findById(
          user.businessIndustryId
        );
        leftCredits = credits - industry?.leadCost;
        leadcpl = industry?.leadCost;
      }
      const userf = await User.findByIdAndUpdate(user?.id, {
        credits: leftCredits,
      });
      if(leftCredits < (leadcpl * PREMIUM_PROMOLINK.LEADS_THRESHOLD)){
     const txn=await Transaction.find({title:transactionTitle.CREDITS_ADDED}).sort({createdAt:-1})
     const notify:any=await Notifications.find({title:"BELOW_5_LEADS_PENDING"}).sort({createdAt:-1})
     if(txn[0]?.createdAt>notify[0]?.createdAt){
              send_email_for_below_5_leads_pending(user.email,{credits:leftCredits,name:user?.firstName+ " "+ user?.lastName})
     }
     else{
      console.log("Email already send.")
     }
      }
      await User.updateMany(
        { invitedById: user?.id },
        { $set: { credits: userf?.credits } }
      );
      const dataToSave: any = {
        userId: user.id,
        cardId: cardDetails?.id,
        isDebited: true,
        title: transactionTitle.NEW_LEAD,
        amount: leadcpl,
        status: "success",
        creditsLeft: user?.credits - leadcpl,
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
        userName: user.firstName,
        firstName: input.firstname,
        lastName: input.lastname,
        phone: input.phone1,
        email: input.email,
      };
      send_email_for_new_lead(user.email, message);
      // const messageToAdmin: any = {
      //   leadsCost: leadcpl,
      //   email: user.email,
      //   cardNumber: cardDetails?.cardNumber?.substr(-4),
      // };
      // send_email_for_new_lead_to_admin(messageToAdmin);
    }

    return res.json({ data: leadsSave });
  };

  static update = async (req: Request, res: Response): Promise<any> => {
    const leadId = req.params.id;
    const input = req.body;
    const lead = await Leads.findById(leadId);
    try {
      const user: any = await User.findOne({ buyerId: lead?.bid });
      if (!user) {
        return res
          .status(400)
          .json({ error: { message: "User of this lead does not exist" } });
      }
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
          { status: leadsStatusEnums.VALID,statusUpdatedAt:new Date() },
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
            statusUpdatedAt:new Date() ,
            clientNotes: input?.clientNotes,
          },
          { new: true }
        );
      }
      if (
        lead?.status != leadsStatusEnums.REPORTED &&
        //@ts-ignore
       ( req.user.role === RolesEnum.ADMIN || req.user.role == RolesEnum.SUPER_ADMIN )&&
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
        //@ts-ignore
        (req.user.role === RolesEnum.ADMIN || req.user.role === RolesEnum.SUPER_ADMIN) && 
        input.status == leadsStatusEnums.REPORT_REJECTED
      ) {
        const leadUser: any = await User.findOne({ buyerId: lead?.bid });

        const message: any = { name: leadUser.firstName + " " + leadUser.lastName};
        send_email_for_lead_status_reject(leadUser?.email, message);
        const leadsUpdate = await Leads.findByIdAndUpdate(
          leadId,
          { ...input, reportRejectedAt: new Date(),statusUpdatedAt:new Date()  },
          { new: true }
        );
        return res.json({ data: leadsUpdate });
      }
      if(input.status){
        await Leads.findByIdAndUpdate(
          leadId,
          { webhookHits:false,webhookHitsCounts:0 },
          { new: true }
        );
      }
      if (
        //@ts-ignore
        (req.user.role === RolesEnum.ADMIN || req.user.role === RolesEnum.SUPER_ADMIN) &&
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

        const message: any = { name: leadUser.firstName + " " + leadUser.lastName};
        send_email_for_lead_status_accept(leadUser?.email, message);
        addCreditsToBuyer(payment)
          .then(async () => {
            const dataToSave: any = {
              userId: user?.id,
              cardId: card?.id,
              amount: lead?.leadsCost,
              title: transactionTitle.LEAD_REJECTION_APPROVED,
              isCredited: true,
              status: "success",
              //@ts-ignore
              creditsLeft: user?.credits + lead?.leadsCost,
            };
            await Transaction.create(dataToSave);
            const leadsUpdate = await Leads.findByIdAndUpdate(
              leadId,
              { ...input, reportAcceptedAt: new Date() , statusUpdatedAt:new Date() },
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
              creditsLeft: user?.credits,
            };
            await Transaction.create(dataToSave);
          });
      } else {
        const leadsUpdate = await Leads.findByIdAndUpdate(
          leadId,
          { ...input,statusUpdatedAt:new Date() },
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
      if (_req.user?.role == RolesEnum["ADMIN"] || _req.user?.role == RolesEnum.SUPER_ADMIN) {
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
      if (_req.user?.role == RolesEnum["ADMIN"] || _req.user?.role == RolesEnum.SUPER_ADMIN) {
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

  static index = async (_req: any, res: Response):Promise<any> => {
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
      let dataToFind: any = {};
      const user = await User.findById(userId);
      if (user?.role == RolesEnum.INVITED) {
        const invitedBy = await User.findOne({ _id: user?.invitedById });
        dataToFind.bid = invitedBy?.buyerId;
      } else {
        dataToFind.bid = user?.buyerId;
      }
      // if (user?.credits == 0 && user?.role == RolesEnum.USER) {
      //   return res
      //     .status(200)
      //     .json({ error: "Insufficient credits!", data: [] });
      // }
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
            { "leads.firstName": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastName": { $regex: _req.query.search, $options: "i" } },
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
                $lookup: {
                  from: "users",
                  localField: "bid",
                  foreignField: "buyerId",
                  as: "clientName",
                },
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
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      const promises = query.results.map((item: any) => {
        item.leads.clientName =
          item["clientName"][0]?.firstName + " " + item["clientName"][0]?.lastName;
        item.leads.status = item.status;
      
        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then((businesss) => {
              item.leads.businessName = businesss?.businessName;
              item.leads.businessIndustry = businesss?.businessIndustry;

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

  static showReportedLeads = async (_req: any, res: Response):Promise<any> => {
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
      if (_req.query.industryId) {
        dataToFind.industryId = new ObjectId(_req.query.industryId);;
      }
      if (_req.query.userId) {
        const businesses=await BusinessDetails.findById(_req.query.userId)

        const user = await User.findOne({businessDetailsId:businesses?.id});

        dataToFind.bid = user?.buyerId;
      }
      // if (user?.credits == 0 && user?.role == RolesEnum.USER) {
      //   return res
      //     .status(200)
      //     .json({ message: "Insufficient credits!", data: [] });
      // }
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
          ],
        };
        skip = 0;
      }
      if (status) {
        dataToFind.status = status;
        // dataToFind = { status: status };
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
        item.leads.clientName =
          item["clientName"][0]?.firstName + " " + item["clientName"][0]?.lastName;
        item.leads.status = item.status;
      
        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then((businesss) => {
              item.leads.businessName = businesss?.businessName;
              item.leads.businessIndustry = businesss?.businessIndustry;

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

  static showAllLeadsToAdminByUserId = async (_req: any, res: Response) : Promise<any>=> {
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
      const businesses=await BusinessDetails.findById(userId)
      const user = await User.findOne({businessDetailsId:businesses?.id});
      let dataToFind: any = {
        bid: user?.buyerId,
        status: { $nin: [leadsStatusEnums.ARCHIVED] },
      };
      if (status) {
        dataToFind.status = status;
      }
      if (_req.query.industryId) {
        dataToFind.industryId = new ObjectId(_req.query.industryId);;
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
            { "leads.firstName": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastName": { $regex: _req.query.search, $options: "i" } },
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
                $lookup: {
                  from: "users",
                  localField: "bid",
                  foreignField: "buyerId",
                  as: "clientName",
                },
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
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      const promises = query.results.map((item: any) => {
        item.leads.clientName =
          item["clientName"][0]?.firstName + " " + item["clientName"][0]?.lastName;
        item.leads.status = item.status;
      
        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then((businesss) => {
              item.leads.businessName = businesss?.businessName;
              item.leads.businessIndustry = businesss?.businessIndustry;

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

  static showAllLeadsToAdmin = async (_req: any, res: Response): Promise<any> => {
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
      if (status) {
        dataToFind = { status: status };
      }
      if (_req.query.industryId) {
        dataToFind.industryId =new ObjectId(_req.query.industryId);
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
            { "leads.firstName": { $regex: _req.query.search, $options: "i" } },
            { "leads.lastName": { $regex: _req.query.search, $options: "i" } },
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
                $lookup: {
                  from: "users",
                  localField: "bid",
                  foreignField: "buyerId",
                  as: "clientName",
                },
              },
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
                },
              },
            ],
            leadsCount: [{ $match: dataToFind }, { $count: "count" }],
          },
        },
      ]);
      const promises = query.results.map((item: any) => {
        item.leads.clientName =
          item["clientName"][0]?.firstName + " " + item["clientName"][0]?.lastName;
        item.leads.status = item.status;
      
        // Use explicit Promise construction
        return new Promise((resolve, reject) => {
          BusinessDetails.findById(item["clientName"][0]?.businessDetailsId)
            .then((businesss) => {
              item.leads.businessName = businesss?.businessName;
              item.leads.businessIndustry = businesss?.businessIndustry;

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
      const user = await User.findById(userId);
      const columnsOfIndustry = await BuisnessIndustries.findById(
        user?.businessIndustryId
      );
      columnsOfIndustry?.columnsNames.map((i: any) => {
        Preference?.columns.map((j: any) => {
          if (i?.defaultColumn == j?.name && i.renamedColumn.length != 0) {
            //@ts-ignore
            j.newName = i?.renamedColumn;
          } else if (
            i?.defaultColumn == j?.name &&
            i.renamedColumn.length === 0
          ) {
            //@ts-ignore
            j.newName = j.name;
          }
        });
      });
      Preference?.columns.map((i: any) => {
        if (!i?.newName) {
          i.newName = i.name;
        }
      });

      if (Preference) {
        return res.json({ data: Preference });
      }
      return res.json({ data: { columns: columnsOfIndustry?.columns } });
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
      const https = require("follow-redirects").https;
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

  static export_csv_file_user_leads = async (_req: any, res: Response) => {
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
    const userId = _req.user?.id;
    const status = _req.query.status;
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
      const pref: LeadTablePreferenceInterface | null =
        await LeadTablePreference.findOne({ userId: user?.id });
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

      return res.json({
        data: filteredDataArray,
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

  static export_csv_file_admin_leads = async (_req: any, res: Response) => {
    const status = _req.query.status;
    let id = _req.query.id;
    let sortingOrder = _req.query.sortingOrder || sort.DESC;
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
      const pref: LeadTablePreferenceInterface | null =
        await LeadTablePreference.findOne({ userId: _req.user.id });

      const filteredDataArray: DataObject[] = filterAndTransformData(
        //@ts-ignore
        pref?.columns,
        convertArray(query.results)
      );
      return res.json({
        data: filteredDataArray,
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


  static managePref= async (_req: any, res: Response)=>{
    const name=_req.body.name
    // Define an array of document IDs
let documentIds = await LeadTablePreference.find({},'_id')
// Iterate over the document IDs
documentIds.forEach(async function(documentId):Promise<any> {
  // Find the length of the "columns" array
  var result = await LeadTablePreference.findOne({ "_id": documentId._id });
  var nameExists = result?.columns.some(function(column:any) {
    return column.name === name;
  });
  console.log("nameExists",nameExists)
  if (!result) {
    console.error("Document not found with _id: " + documentId);
    return;
  }
// if(result.columns)  
  var columnsLength = result?.columns?.length;

  // Create the object to push with the correct "index" value
  var objectToPush = {
    "name": name,
    "isVisible": true,
    "index": columnsLength,
    "newName": name
  };

  // Push the object to the "columns" array for the current document
  if(!nameExists){
   return  await LeadTablePreference.updateOne(
    { "_id": documentId },
    {
      $push: {
        "columns": objectToPush
      }
    },
  );
  
  }
else{
  console.log("already exist")
}
});
res.send({data:"successfully inserted"})
  }


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
        filteredData[column.newName || column.name] = dataObj[column.name];
      }
    });

    return filteredData;
  });
}

