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
      if(input?.freeCredits <0 || input?.topUpAmount <0){
        res.status(400).json({ error: { message: "Invalid value" } });
      }
      const dataToSave: any = {
        code: randomString(10),
        freeCredits: input.freeCredits,
        topUpAmount: input.topUpAmount,
        maxUseCounts: input.maxUseCounts,
        useCounts: 0,
      };
      if (input.spotDiffPremiumPlan) {
        dataToSave.code = 'SPOTDIFF_' + randomString(10)
        dataToSave.spotDiffPremiumPlan = true
      }
      if (input.spotDiffPremiumPlan && !input.topUpAmount) {
        res.status(400).json({ error: { message: "Top-up amount is required" } });
      }
      const data = await FreeCreditsLink.create(dataToSave);
      return res.json({ data: data });
    } catch (error) {
      res.status(500).json({ error: { message: "something Went wrong." } });
    }
  };

  static show = async (req: any, res: Response): Promise<any> => {
    let dataToFind: any = {};
    if (req.query.search) {
      dataToFind = {
        ...dataToFind,
        $or: [{ code: { $regex: req.query.search, $options: "i" } }],
      };
    }
    if (!req.query.spotDiffPremiumPlan) {
      dataToFind.spotDiffPremiumPlan = { $exists: false }
    }
    if (req.query.spotDiffPremiumPlan) {
      dataToFind.spotDiffPremiumPlan = true
    }
    if (req.query.expired) {
      dataToFind.isDisabled = true
    }
    if (req.query.live) {
      dataToFind.isDisabled = false
    }
    try {
      //TODO: need to reduce user data
      let query = await FreeCreditsLink.find(dataToFind)
        // .populate("user.userId")
        // .sort({ createdAt: -1 })

        .populate("user.userId", "_id firstName lastName createdAt")
        .sort({ createdAt: -1 })
        .select("_id code freeCredits useCounts maxUseCounts isDisabled isUsed usedAt topUpAmount user createdAt updatedAt __v")
        .lean();
      //   query=[
      //     {
      //         "_id": "64bf6c775e81bc6e7712b105",
      //         "code": "K1d7AWpQb4",
      //         "freeCredits": 50,
      //         "useCounts": 4,
      //         "maxUseCounts": null,
      //         "isDisabled": false,
      //         "isUsed": true,
      //         "usedAt": "2023-07-25T09:43:04.303Z",
      //         "topUpAmount": 600,
      //         "user": [
      //             {
      //                 "userId": null,
      //                 "_id": "64bf705de2373daf50d6ef74"
      //             },
      //             {
      //                 "userId": null,
      //                 "_id": "64bf7093a039d8f559326ef7"
      //             },
      //             {

      //                     "_id": "64bf98beee8da2afaa6b111f",
      //                     "firstName": "John",
      //                     "lastName": "Doe",
      //                     "createdAt": "2023-07-25T09:41:18.139Z"

      //             },
      //             {

      //                     "_id": "64bf9928ee8da2afaa6b1131",
      //                     "firstName": "John",
      //                     "lastName": "Doe",
      //                     "createdAt": "2023-07-25T09:43:04.298Z"

      //             }
      //         ],
      //         "createdAt": "2023-07-25T06:32:23.991Z",
      //         "updatedAt": "2023-07-25T09:43:04.304Z",
      //         "__v": 0
      //     },
      //     {
      //         "_id": "64bf6c695e81bc6e7712b102",
      //         "code": "SwiPu5eUsw",
      //         "freeCredits": 200,
      //         "useCounts": 2,
      //         "maxUseCounts": 6,
      //         "isDisabled": false,
      //         "isUsed": true,
      //         "usedAt": "2023-07-25T06:47:31.545Z",
      //         "topUpAmount": 50,
      //         "user": [

      //             {

      //                     "_id": "64bf70030ab22c70c765f29f",
      //                     "firstName": "John",
      //                     "lastName": "Doe",
      //                     "createdAt": "2023-07-25T06:47:31.538Z"

      //             }
      //         ],
      //         "createdAt": "2023-07-25T06:32:09.362Z",
      //         "updatedAt": "2023-07-25T06:47:31.546Z",
      //         "__v": 0
      //     },
      //     {
      //         "_id": "64bf6c5f5e81bc6e7712b0ff",
      //         "code": "Ln9mawohAQ",
      //         "freeCredits": 100,
      //         "useCounts": 0,
      //         "maxUseCounts": 5,
      //         "isDisabled": false,
      //         "isUsed": false,
      //         "usedAt": null,
      //         "topUpAmount": 40,
      //         "user": [],
      //         "createdAt": "2023-07-25T06:31:59.727Z",
      //         "updatedAt": "2023-07-25T06:31:59.727Z",
      //         "__v": 0
      //     }
      // ]
      const transformedArray = query.map((item: any) => {
        return {
          ...item,
          user: item?.user.map((userItem: any) => {
            if(userItem.userId){  return userItem.userId}
            else{
            //   console.log("herererererr",userItem)
            //  return userItem = undefined
            //   console.log("aftreerererre",userItem)

            }
          })
        };
      });
      return res.json({
        data: transformedArray,
      });
    } catch (error) {
      res.status(500).json({ error: { message: "something Went wrong." } });
    }
  };

  static delete = async (req: Request, res: Response): Promise<any> => {
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

}
