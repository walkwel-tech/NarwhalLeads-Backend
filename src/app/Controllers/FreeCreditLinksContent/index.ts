import { Request, Response } from "express";
import { createFreeCreditLinkContent } from "./Actions/createFreeCreditLinkContentAction";
import { getFreeCreditLinkContent } from "./Actions/getFreeCreditLinkContentAction";
import { updatePromoLinkContent } from "./Actions/updateFreeCreditLinkContentAction";

export class FreeCreditsLinkContentController {
  static create = async (req: Request, res: Response) => {
    return createFreeCreditLinkContent(req, res);
  };

  static get = (req: Request, res: Response) => {
    return getFreeCreditLinkContent(req, res);
  };

  static update = (req:Request, res:Response) => {
    return updatePromoLinkContent(req, res);
  }
}
