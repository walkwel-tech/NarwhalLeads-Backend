import { Request, Response } from "express";
import { create } from "./Actions/createBusinessAction";
import { deleteBusiness } from "./Actions/deleteBusinessAction";
import { show } from "./Actions/getBusinessAction";
import { showById } from "./Actions/getBusinessByIdAction";
import { nonBillableBusinessDetails } from "./Actions/nonBillableBusinessAction";
import { updateBusinessDetails } from "./Actions/updateBusinessAction";



export class BusinessDetailsController {
  static createBusiness = async (req: Request, res: Response) => {
    return create(req, res);
  };


  static deleteBusiness = (req: Request, res: Response) => {
    return deleteBusiness(req, res);
  };

  static getBusiness = async (req: Request, res: Response) => {
    return show(req, res);
  };

  static getBusinessById = async (req: Request, res: Response) => {
    return showById(req, res);
  };

  static nonBillableBusiness = async (req: Request, res: Response) => {
    return nonBillableBusinessDetails(req, res);
  };

  static updateBusiness = async (req: Request, res: Response) => {
    return updateBusinessDetails(req, res);
  };


}
