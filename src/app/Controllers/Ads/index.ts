import { Request, Response } from "express";
import { createAdAction } from "./Actions/createAd.action";
import { getAllAdsAction } from "./Actions/getAllAds.action";
import { deleteAdAction } from "./Actions/deleteAd.action";
import { updateAdAction } from "./Actions/updateAd.action";
import { updateAdClickAction } from "./Actions/updateAdClick.action";
import { getAdsBasedOnUserAction } from "./Actions/getsAdBasedOnUser.action";

export class AdsController {
  static createAd = async (req: Request, res: Response): Promise<Response> => {
    return createAdAction(req, res);
  };

  static getAllAds = async (req: Request, res: Response): Promise<Response> => {
    return getAllAdsAction(req, res);
  };

  static deleteAd = async (req: Request, res: Response): Promise<Response> => {
    return deleteAdAction(req, res);
  };

  static updateAd = async (req: Request, res: Response): Promise<Response> => {
    return updateAdAction(req, res);
  };

  static updateAdClick = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    return updateAdClickAction(req, res);
  };

  static getAdsBasedOnUser = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    return getAdsBasedOnUserAction(req, res);
  };
}
