import { Request, Response } from "express";
import { order } from "../../utils/constantFiles/businessIndustry.orderList";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { User } from "../Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { IndustryInput } from "../Inputs/Industry.input";
import { validate } from "class-validator";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { BuisnessIndustriesInterface } from "../../types/BuisnessIndustriesInterface";
// import { columnsObjects } from "../../types/columnsInterface";
import { json } from "../../utils/constantFiles/businessIndustryJson";
import { UserInterface } from "../../types/UserInterface";
import mongoose from "mongoose";
const LIMIT = 10;
const ObjectId = mongoose.Types.ObjectId;
import { countryCurrency } from "../../utils/constantFiles/currencyConstants";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { cmsUpdateWebhook } from "../../utils/webhookUrls/cmsUpdateWebhook";
import { BuyerQuestion } from "../../types/BuyerDetailsInterface";
import { leadCenterWebhook } from "../../utils/webhookUrls/leadCenterWebhook";
import { DELETE, POST } from "../../utils/constantFiles/HttpMethods";


type WebhookData = {
  buyerQuestions: BuyerQuestion[];
  industry: string;
};
export class IndustryController {
  static create = async (req: Request, res: Response) => {
    const input = req.body;
    const Industry = new IndustryInput();
    Industry.industry = input.industry;
    Industry.leadCost = input.leadCost;
    Industry.currencyCode = input.currencyCode;
    Industry.avgConversionRate = input.avgConversionRate;
    Industry.minimumTopupLeads = input.minimumTopupLeads;
    Industry.buyerQuestions = input.buyerQuestions;

    const errors = await validate(Industry);

    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      return res
        .status(400)
        .json({ error: { message: "VALIDATIONS_ERROR", info: errorsInfo } });
    }
    const currency = countryCurrency.find(
      ({ value }) => value === input.currencyCode
    );
    if (!currency) {
      return res.status(400).json({ error: { message: "Invalid currency" } });
    }

    if (Industry.buyerQuestions) {
      const webhookData = {
        industry: Industry.industry,
        ...Industry.buyerQuestions.reduce((acc:any, question, index) => {
          acc[`question${index + 1}`] = question.title;
          return acc;
        }, {})
      };
    
      await cmsUpdateWebhook("industry", POST, webhookData);
    }
    
    let dataToSave: Partial<BuisnessIndustriesInterface> = {
      industry: input.industry.trim(),
      leadCost: input.leadCost,
      avgConversionRate: input.avgConversionRate,
      columns: order,
      json: json,
      country: currency.country,
      associatedCurrency: Industry.currencyCode,
      minimumTopupLeads: Industry.minimumTopupLeads,
      buyerQuestions: Industry.buyerQuestions,
    };

    try {
      const exist = await BuisnessIndustries.find({
        industry: { $regex: input.industry.trim(), $options: "i" },
        isDeleted: false,
      });
      if (exist.length > 0) {
        return res
          .status(400)
          .json({ error: { message: "Business Industry should be unique." } });
      }

      const details = await BuisnessIndustries.create(dataToSave);
      leadCenterWebhook("industries/data-sync/", POST, details);

      return res.json({ data: details });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static updateOrg = async (req: Request, res: Response) => {
    const input = req.body;
    try {
      const updatedData = await BuisnessIndustries.findByIdAndUpdate(
        req.params.id,
        {
          ...input,
        },
        { new: true }
      );
      if (updatedData === null) {
        return res
          .status(404)
          .json({ error: { message: "Business Industry not found." } });
      }

      if (input.leadCost) {
        await User.updateMany(
          { businessIndustryId: updatedData?.id },
          { leadCost: input.leadCost }
        );
      }

      return res.json({ data: updatedData });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static update = async (req: Request, res: Response) => {
    const input = req.body;
    try {
      if (input.columns) {
        const users = await User.find({ businessIndustryId: req.params.id });
        const data = users.map(async (user: any) => {
          return new Promise(async (resolve, reject) => {
            try {
              const updatedUser = await LeadTablePreference.findOneAndUpdate(
                { userId: user.id },
                {
                  columns: input.columns,
                },
                { new: true }
              );
              resolve(updatedUser); // Resolve the promise with the result
            } catch (error) {
              reject(error); // Reject the promise if an error occurs
            }
          });
        });
        await Promise.all(data);
      }

      const updatedData = await BuisnessIndustries.findByIdAndUpdate(
        req.params.id,
        {
          ...input,
        },
        { new: true }
      );
      if (updatedData === null) {
        return res
          .status(404)
          .json({ error: { message: "Business Industry not found." } });
      }
      updatedData?.columns.sort((a: any, b: any) => a.index - b.index);

        const webhookData = {
          industry: updatedData?.industry,
          ...updatedData?.buyerQuestions.reduce((acc:any, question, index) => {
            acc[`question${index + 1}`] = question?.title;
            return acc;
          }, {})
        };
       await cmsUpdateWebhook("industry", POST, webhookData);
      

      leadCenterWebhook("industries/data-sync/", POST, updatedData);


      if (input.leadCost) {
        const usersToUpdate = await User.find({
          businessIndustryId: updatedData?.id,
          promoLinkId: null,
        });

        const usersToUpdateWithDiscount = await User.find({
          businessIndustryId: updatedData?.id,
          promoLinkId: { $ne: null },
        });

        const updatePromoUsersWithDiscount = async (
          user:UserInterface
        ): Promise<any> => {
          const promolink = await FreeCreditsLink.findById(user.promoLinkId);
          if (promolink) {
            const discount = promolink.discount || 0;
            const discountedLeadCost = input.leadCost * (1 - discount / 100);
            return User.findByIdAndUpdate(user._id, {
              leadCost: +discountedLeadCost.toFixed(3),
            });
          }
        };

        const updateUserPromises = usersToUpdateWithDiscount.map(
          updatePromoUsersWithDiscount
        );

        await Promise.all(updateUserPromises);
        await User.updateMany(
          { _id: { $in: usersToUpdate.map((user) => user._id) } },
          { leadCost: input.leadCost }
        );
      }
      
      return res.json({ data: updatedData });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static view = async (req: Request, res: Response) => {
    try {
      let user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
      const sortField: any = req.query.sort || "industry"; // Change this field name as needed

      let sortOrder: any = req.query.order || 1; // Change this as needed

      const perPage =
        //@ts-ignore
        req.query && req.query?.perPage > 0
          ? //@ts-ignore
            parseInt(req.query?.perPage)
          : LIMIT;

      let skip =
        //@ts-ignore
        (req.query && req.query.page > 0 ? parseInt(req.query.page) - 1 : 0) *
        perPage;
      if (sortOrder == "asc") {
        sortOrder = 1;
      } else {
        sortOrder = -1;
      }
      let dataToFind: any = { isDeleted: false };
      if (req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [{ industry: { $regex: req.query.search, $options: "i" } }],
        };
      }
      const sortObject: Record<string, 1 | -1> = {};
      sortObject[sortField] = sortOrder;
      if (user.role === RolesEnum.ACCOUNT_MANAGER) {
        const industries = await User.aggregate([
          {
            $match: {
              accountManager: new ObjectId(user._id), // Replace with the actual Account Manager's ID
            },
          },
          {
            $lookup: {
              from: "buisnessindustries",
              localField: "businessIndustryId",
              foreignField: "_id",
              as: "industry",
            },
          },
          {
            $unwind: "$industry",
          },
          {
            $group: {
              _id: "$industry._id",
              name: { $first: "$industry.industry" },
            },
          },
          {
            $project: {
              _id: 0,
              id: "$_id",
              // name: 1,
            },
          },
        ]);
        let ids: any[] = [];
        industries.map((id) => {
          ids.push(id.id);
        });
        dataToFind._id = { $in: ids };
      }

      let data = await BuisnessIndustries.find(dataToFind)
        .collation({ locale: "en" })
        .sort(sortObject)
        .skip(skip)
        .limit(perPage);
      const dataWithoutPagination = await BuisnessIndustries.find(dataToFind)
        .collation({ locale: "en" })
        .sort({ industry: 1 });
      const totalPages = Math.ceil(dataWithoutPagination.length / perPage);

      if (data && req.query.perPage) {
        let dataToShow = {
          data: data,
          meta: {
            perPage: perPage,
            page: req.query.page || 1,
            pages: totalPages,
            total: dataWithoutPagination.length,
          },
        };
        return res.json(dataToShow);
      } else if (data && !req.query.perPage) {
        let dataToShow = {
          data: dataWithoutPagination,
        };
        return res.json(dataToShow);
      } else {
        return res.status(404).json({ data: { message: "Data not found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static getCurrency = async (req: Request, res: Response) => {
    try {
      return res.json({ data: countryCurrency });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static viewbyId = async (req: Request, res: Response) => {
    try {
      const data = await BuisnessIndustries.findById(req.params.id);
      if (data?.isDeleted) {
        return res
          .status(404)
          .json({ error: { message: "Business Industry is deleted" } });
      }

      return res.json({ data: data });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static delete = async (req: Request, res: Response) => {
    try {
      const users = await User.find({
        businessIndustryId: req.params.id,
        isDeleted: false,
        role: RolesEnum.USER,
      });
      if (users.length > 0) {
        return res.status(400).json({
          error: {
            message:
              "Users already registered with this industry. kindly first delete those users.",
          },
        });
      } else {
        await BuisnessIndustries.findByIdAndUpdate(req.params.id, {
          isDeleted: true,
          deletedAt: new Date(),
        });
        const data = await BuisnessIndustries.findById(req.params.id);
        leadCenterWebhook(`industries/data-delete-sync/?id=${req.params.id}`, DELETE, {} );

      
        return res.json({ data: data });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showIndustries = async (req: Request, res: Response) => {
    try {
      const data = await BuisnessIndustries.find(
        { isActive: true, isDeleted: false },
        { industry: 1 }
      );
      if (data) {
        let array: any = [];
        data.map((data) => {
          array.push(data.industry);
        });
        return res.json({ data: array });
      } else {
        return res.status(404).json({ data: { message: "Data not found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static stats = async (_req: any, res: Response) => {
    try {
      const active = await BuisnessIndustries.find({
        isActive: true,
        isDeleted: false,
      }).count();
      const paused = await BuisnessIndustries.find({
        isActive: false,
        isDeleted: false,
      }).count();

      const dataToShow = {
        activeBusinessIndustries: active,
        pausedBusinessIndustries: paused,
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
