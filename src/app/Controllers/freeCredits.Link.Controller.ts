import { Request, Response } from "express";
import { FreeCreditsLink } from "../Models/freeCreditsLink";

let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length: number) {
  let result = "";
  for (let i = 0; i < length; ++i) {
    result += alphabet[Math.floor(alphabet.length * Math.random())];
  }
  return result;
}

export class freeCreditsLinkController {
  static create = async (req: Request, res: Response): Promise<any> => {
    try {
      const input = req.body;
      if (input?.freeCredits < 0 || input?.topUpAmount < 0) {
        res.status(400).json({ error: { message: "Invalid value" } });
      }
      let dataToSave: any = {
        code: randomString(10),
        freeCredits: input.freeCredits,
        topUpAmount: input.topUpAmount,
        maxUseCounts: input.maxUseCounts,
        useCounts: 0,
        name: input.name,
      };
      if (input.code) {
        dataToSave.code = input.code;
        const code = await FreeCreditsLink.find({
          code: input.code,
          isDeleted: false,
        });
        if (code.length > 0) {
          res
            .status(400)
            .json({ error: { message: "Duplicate codes are not allowed" } });
        }
      }
      if (input.spotDiffPremiumPlan) {
        dataToSave.code = "SPOTDIFF_" + randomString(10);
        dataToSave.spotDiffPremiumPlan = true;
      }
      if (input.spotDiffPremiumPlan && !input.topUpAmount) {
        res
          .status(400)
          .json({ error: { message: "Top-up amount is required" } });
      }
      const data = await FreeCreditsLink.create(dataToSave);
      return res.json({ data: data });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ error: { message: "something Went wrong.", error } });
    }
  };

  static show = async (req: any, res: Response): Promise<any> => {
    let dataToFind: any = { isDeleted: false };
    if (req.query.search) {
      dataToFind = {
        ...dataToFind,
        $or: [{ code: { $regex: req.query.search, $options: "i" } }],
      };
    }
    if (!req.query.spotDiffPremiumPlan) {
      dataToFind.spotDiffPremiumPlan = { $exists: false };
    }
    if (req.query.spotDiffPremiumPlan) {
      dataToFind.spotDiffPremiumPlan = true;
    }
    if (req.query.expired) {
      dataToFind.isDisabled = true;
    }
    if (req.query.live) {
      dataToFind.isDisabled = false;
    }
    try {
      let query = await FreeCreditsLink.aggregate([
        { $match: dataToFind },
        {
          $lookup: {
            from: "users", // Replace with the actual name of your "users" collection
            localField: "users",
            foreignField: "_id",
            as: "usersData",
          },
        },
        {
          $lookup: {
            from: "businessdetails", // Replace with the actual name of your "BusinessDetails" collection
            localField: "usersData.businessDetailsId",
            foreignField: "_id",
            as: "businessDetails",
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $project: {
            _id: 1,
            code: 1,
            freeCredits: 1,
            useCounts: 1,
            maxUseCounts: 1,
            name: 1,
            isDisabled: 1,
            isUsed: 1,
            usedAt: 1,
            topUpAmount: 1,
            createdAt: 1,
            updatedAt: 1,
            isDeleted:1,
            __v: 1,
            users: {
              $mergeObjects: [
                {
                  userData: "$usersData", // Replace with the actual path to the user's _id field
                  // userCount: "$user.userCount"
                },
                {
                  businessDetailsId: "$businessDetails" // Populate "businessDetailsId" with the "businessDetails" data
                }
              ]
            },
          },
        },
      ]);
      const transformedData = query.map(item => {
        const usersData = item.users.userData.map((user:any) => {
            const businessDetails = item.users.businessDetailsId.find((business:any) => business._id.equals(user.businessDetailsId));
            const businessName = businessDetails ? businessDetails.businessName : '';
            
            return {
                "_id": user._id,
                "firstName": user.firstName,
                "lastName": user.lastName,
                "email": user.email,
                "businessName": businessName,
                "createdAt":user.createdAt
                // Add other properties you need from the user object
            };
        });
    
        return {
            "_id": item._id,
            "code": item.code,
            "freeCredits": item.freeCredits,
            "useCounts": item.useCounts,
            "maxUseCounts": item.maxUseCounts,
            "isDisabled": item.isDisabled,
            "isUsed": item.isUsed,
            "usedAt": item.usedAt,
            "topUpAmount": item.topUpAmount,
            "name": item.name,
            "createdAt": item.createdAt,
            "updatedAt": item.updatedAt,
            "__v": item.__v,
            "users": usersData,
        };
    });

      return res.json({
        data: transformedData,
      });
    } catch (error) {
      res.status(500).json({ error: { message: "something Went wrong." } });
    }
  };

  static expire = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    try {
      const dataToSave: any = {
        isDisabled: true,
      };
      const data = await FreeCreditsLink.findByIdAndUpdate(id, dataToSave, {
        new: true,
      });
      return res.json({ data: data });
    } catch (error) {
      res.status(500).json({ error: { message: "something Went wrong." } });
    }
  };

  static delete = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    try {
      const dataToSave: any = {
        isDeleted: true,
        deletedAt: new Date(),
      };

      const data = await FreeCreditsLink.findByIdAndUpdate(id, dataToSave, {
        new: true,
      });
      return res.json({ data: data });
    } catch (error) {
      res.status(500).json({ error: { message: "something Went wrong." } });
    }
  };
}
