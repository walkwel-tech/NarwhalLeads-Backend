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
import { managePaymentsByPaymentMethods } from "../../utils/payment";
import { RegisterInput } from "../Inputs/Register.input";
import { send_email_for_updated_details } from "../Middlewares/mail";
import { BusinessDetails } from "../Models/BusinessDetails";
import { CardDetails } from "../Models/CardDetails";
import { Invoice } from "../Models/Invoice";
import { Transaction } from "../Models/Transaction";
import { User } from "../Models/User";
import { UserLeadsDetails } from "../Models/UserLeadsDetails";
import { ClientTablePreferenceInterface } from "../../types/clientTablePrefrenceInterface";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { Column } from "../../types/ColumnsPreferenceInterface";
import { Admins } from "../Models/Admins";
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
        role: { $nin: [RolesEnum.ADMIN, RolesEnum.INVITED, RolesEnum.SUPER_ADMIN] },
        // role:{$ne: RolesEnum.INVITED },
        isDeleted: false,
        isArchived: JSON.parse(isArchived?.toLowerCase()),
      };
      if(_req.query.isActive){
        dataToFind.isActive=JSON.parse(isActive?.toLowerCase())
        dataToFind.isArchived=false
      }
      if(_req.query.isArchived){
        dataToFind.isArchived=JSON.parse(isArchived?.toLowerCase())
      }
      if (_req.query.industryId) {
        dataToFind.businessIndustryId = new ObjectId(_req.query.industryId);
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
          ],
        };
        skip = 0;
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
              // {
              //   $lookup: {
              //     from: "buisnessindustries",
              //     localField: "businessIndustryId",
              //     foreignField: "_id",
              //     as: "businessIndustryId",
              //   },
              // },
              { $match: dataToFind },

              //@ts-ignore
              { $sort: { createdAt: sortingOrder } },
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
                  createdAt: 0,
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
        item.userLeadsDetailsId = userLeadsDetailsId;
        item.businessDetailsId = businessDetailsId;
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
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static show = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    let query;
    try {
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
              { $match: { _id: new ObjectId(id) } }
                        ],
          },
        },
      ]);
      query.results.map((item: any) => {
        delete item.password
        let businessDetailsId = Object.assign({}, item["businessDetailsId"][0]);
        let cardDetailsId = Object.assign({}, item["cardDetailsId"][0]);
        let userLeadsDetailsId = Object.assign(
          {},
          item["userLeadsDetailsId"][0]
        );
        item.userLeadsDetailsId = userLeadsDetailsId;
        item.businessDetailsId = businessDetailsId;
        item.cardDetailsId = cardDetailsId;
      });
      if(query.results.length==0){
        [query] = await Admins.aggregate([
          {
            $facet: {
              results: [
                { $match: { _id: new ObjectId(id) } }
                          ],
            },
          },
        ]);
      }
      return res.json({ data: query.results[0] });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static indexName = async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await User.find(
        { role: { $nin: [RolesEnum.ADMIN, RolesEnum.INVITED,RolesEnum.SUPER_ADMIN] } , isArchived:false},
        "firstName lastName email buyerId"
      ).sort("firstName")
      ;

      if (user) {
        return res.json({ data: user });
      }

      return res.status(404).json({ error: { message: "User not found." } });
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
    // @ts-ignore
    if ((input.email || input.email =="")) {
      // @ts-ignore
      input.email = req.user?.email
      // return res
      // .status(403)
      // .json({ error: { message: "You can not update your email." } });  

    }

    try {
      const checkUser = await User.findById(id);
      if (
        input.paymentMethod === paymentMethodEnum.WEEKLY_PAYMENT_METHOD &&
        // checkUser?.paymentMethod == paymentMethodEnum.WEEKLY_PAYMENT_METHOD
        //@ts-ignore
        req.user?.role === RolesEnum.USER
      ) {
        return res
          .status(403)
          .json({ error: { message: "Please contact admin to request for weekly payment method" } });
      }
      if (
            // @ts-ignore
        (input.buyerId || input.leadCost || input.ryftClientId || input.xeroContactId || input.role) &&  req.user?.role == RolesEnum.USER
      ) {
        return res
          .status(403)
          .json({ error: { message: "Please contact admin to update." } });
      }
      if (
        input.paymentMethod &&
         // @ts-ignore
        checkUser?.paymentMethod == paymentMethodEnum.WEEKLY_PAYMENT_METHOD && req.user?.role===RolesEnum.USER
      ) {
        return res
          .status(403)
          .json({ error: { message: "Please contact admin to change payment method" } });
      }
      if (!checkUser) {
        const admin=await Admins.findById(id)
        if(!admin){
          return res
          .status(404)
          .json({ error: { message: "Admin to update does not exists." } });
        } else if(!checkUser && !admin){
          return res
          .status(404)
          .json({ error: { message: "User to update does not exists." } });
        }
        else{
          const data=await Admins.findByIdAndUpdate(id,input,{new:true})
          return res.json({ data: data });
        }
       
      }

      const cardExist = await CardDetails.findOne({
        userId: checkUser?._id,
        isDefault: true,
      });

      if (
        !cardExist &&
        input.credits &&
        //@ts-ignore
        (req?.user.role == RolesEnum.USER || req?.user.role == RolesEnum.ADMIN || req?.user.role == RolesEnum.SUPER_ADMIN)
      ) {
        return res
          .status(404)
          .json({ error: { message: "Card Details not found!" } });
      }
      if (input.businessName) {
        if(!checkUser.businessDetailsId){
          return res.status(400).json({error:{message:"business details not found"}})
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessName: input.businessName },

          { new: true }
        );
      }
      if (input.businessAddress) {
        if(!checkUser.businessDetailsId){
          return res.status(400).json({error:{message:"business details not found"}})
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessAddress: input.businessAddress },

          { new: true }
        );
      }
      if (input.businessCity) {
        if(!checkUser.businessDetailsId){
          return res.status(400).json({error:{message:"business details not found"}})
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessCity: input.businessCity },

          { new: true }
        );
      }
      if (input.businessCountry) {
        if(!checkUser.businessDetailsId){
          return res.status(400).json({error:{message:"business details not found"}})
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessCountry: input.businessCountry },

          { new: true }
        );
      }
      if (input.businessPostCode) {
        if(!checkUser.businessDetailsId){
          return res.status(400).json({error:{message:"business details not found"}})
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessPostCode: input.businessPostCode },

          { new: true }
        );
      }
      if (input.businessIndustry) {
        if(!checkUser.businessDetailsId){
          return res.status(400).json({error:{message:"business details not found"}})
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessIndustry: input.businessIndustry },

          { new: true }
        );
      }
      if (input.businessOpeningHours) {
        if(!checkUser.businessDetailsId){
          return res.status(400).json({error:{message:"business details not found"}})
        }
        await BusinessDetails.findByIdAndUpdate(
          checkUser?.businessDetailsId,
          { businessOpeningHours: input.businessOpeningHours },

          { new: true }
        );
      }
      if (input.total) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { total: input.total },

          { new: true }
        );
      }
      if (input.weekly) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { weekly: input.weekly },

          { new: true }
        );
      }
      if (input.monthly) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { monthly: input.monthly },

          { new: true }
        );
      }
      if (input.leadSchedule) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { leadSchedule: input.leadSchedule },

          { new: true }
        );
      }
      if (input.postCodeTargettingList) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { postCodeTargettingList: input.postCodeTargettingList },

          { new: true }
        );
      }
      if (input.leadAlertsFrequency) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { leadAlertsFrequency: input.leadAlertsFrequency },

          { new: true }
        );
      }
      if (input.zapierUrl) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { zapierUrl: input.zapierUrl, sendDataToZapier: true },

          { new: true }
        );
      }
      if (input.daily) {
        if(!checkUser.userLeadsDetailsId){
          return res.status(400).json({error:{message:"lead details not found"}})
        }
        input.daily=parseInt(input.daily)
        await UserLeadsDetails.findByIdAndUpdate(
          checkUser?.userLeadsDetailsId,
          { daily: input.daily },

          { new: true }
        );
      }
      // @ts-ignore
      if (input.credits && (req?.user.role == RolesEnum.ADMIN || req?.user.role == RolesEnum.SUPER_ADMIN )) {
        const params: any = {
          fixedAmount: input.credits,
          email: checkUser?.email,
           cardNumber:cardExist?.cardNumber,
          buyerId: checkUser?.buyerId,
          clientId:checkUser.ryftClientId,
          cardId:cardExist?.id
        };

        managePaymentsByPaymentMethods(params)
          .then(async (res) => {
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
              creditsLeft: checkUser?.credits + input.credits

            };

            const transaction = await Transaction.create(dataToSave);
            if (checkUser?.xeroContactId) {
              generatePDF(
                checkUser?.xeroContactId,
                transactionTitle.CREDITS_ADDED,
                //@ts-ignore
                input?.credits
              )
                .then(async (res: any) => {
                  const dataToSaveInInvoice: any = {
                    userId: checkUser?.id,
                    transactionId: transaction.id,
                    price: input.credits,
                    invoiceId: res.data.Invoices[0].InvoiceID,
                  };
                  await Invoice.create(dataToSaveInInvoice);
                  await Transaction.findByIdAndUpdate(transaction.id, { invoiceId: res.data.Invoices[0].InvoiceID, })

                  console.log("PDF generated");
                })
                .catch(async (err) => {
                  refreshToken().then(async (res) => {
                    generatePDF(
                      checkUser?.xeroContactId,
                      transactionTitle.CREDITS_ADDED,
                      //@ts-ignore
                      input.credits
                    ).then(async (res: any) => {
                      const dataToSaveInInvoice: any = {
                        userId: checkUser?.id,
                        transactionId: transaction.id,
                        price: input.credits,
                        invoiceId: res.data.Invoices[0].InvoiceID,
                      };
                      await Invoice.create(dataToSaveInInvoice);
                      await Transaction.findByIdAndUpdate(transaction.id, { invoiceId: res.data.Invoices[0].InvoiceID, })

                      console.log("PDF generated");
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
            // send_email_for_failed_autocharge(i.email, subject, text);
            const dataToSave: any = {
              userId: checkUser?.id,
              cardId: cardExist?.id,
              amount: input.credits,
              title: transactionTitle.CREDITS_ADDED,
              isCredited: true,
              status: "error",
              creditsLeft: checkUser?.credits

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
        const buinessData= await BusinessDetails.findById(result?.businessDetailsId)
        const leadData= await UserLeadsDetails.findById(result?.userLeadsDetailsId)
        const formattedPostCodes=leadData?.postCodeTargettingList.map((item:any) => item.postalCode).flat();

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
          area: `${formattedPostCodes}`
        }
        send_email_for_updated_details(message)
if(input.triggerAmount || input.autoChargeAmount){
  return res.json({message:"Auto Top-Up Settings Updated Successfully",data:result})
}
else if(input.paymentMethod){
  return res.json({message:"Payment Mode Changed Successfully",data:result});
}

else {
  return res.json({message:"Updated Successfully",data:result});
}
      }  
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
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
      input.forEach(async (i: { _id: any; rowIndex: any }) => {
        await User.findByIdAndUpdate(
          { _id: i._id },
          { rowIndex: i.rowIndex },
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
      let dataToFind: any = {  role:{$nin: [RolesEnum.ADMIN, RolesEnum.INVITED,RolesEnum.SUPER_ADMIN]},  isDeleted: false, };
      if(_req.query.invited){
        dataToFind.role={$nin: [RolesEnum.ADMIN]}
      }
      if(_req.query.isActive){
        dataToFind.isActive=true
        dataToFind.isArchived=false
      }

      if(_req.query.isInActive){
        dataToFind.isActive=false
        dataToFind.isArchived=false
      }

      if(_req.query.isArchived){
        dataToFind.isArchived=true
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
      const arr = filteredDataArray
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
