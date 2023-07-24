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
      const dataToSave: any = {
        code: randomString(10),
        freeCredits: input.freeCredits,
        topUpAmount:input.topUpAmount,
        maxUseCounts: input.maxUseCounts,
        useCounts: 0,
      };
      if(input.spotDiffPremiumPlan){
        dataToSave.code='SPOTDIFF_' + randomString(10)
        dataToSave.spotDiffPremiumPlan=true
      }
      if(input.spotDiffPremiumPlan && !input.topUpAmount){
        res.status(400).json({ error: { message: "Top-up amount is required" } });
      }
      const data = await FreeCreditsLink.create(dataToSave);
      console.log(data)
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
    if(!req.query.spotDiffPremiumPlan){
      dataToFind.spotDiffPremiumPlan={ $exists: false}
    }   
     if(req.query.spotDiffPremiumPlan){
      dataToFind.spotDiffPremiumPlan=true
    }
    if(req.query.expired){
      dataToFind.isDisabled=true
    }
    if(req.query.live){
      dataToFind.isDisabled=false
    }
    try {
      const query = await FreeCreditsLink.find(dataToFind)
        .populate("user.userId")
        .sort({ createdAt: -1 });
      return res.json({
        data: query,
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
