import { BusinessDetails } from "../../../Models/BusinessDetails";
import { User } from "../../../Models/User";
import { Request, Response } from "express";


export const isXeroCustomer = async (req: Request, res: Response) => {
    const userId = req.params.id;

    try {
      const user = await User.findById(userId);
      const business = await BusinessDetails.findById(user?.businessDetailsId);

      if (!business) {
        throw new Error("Business Not Found for the user");
      }
      const paramsToCreateContact = {
        name: user?.firstName + " " + user?.lastName,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        clientStatus: user?.clientStatus,
        currency:user?.country,
        country:user?.country,
        addressLine1: business?.businessName,
        addressLine2: business?.address1 + " " + business?.address2,
        city: business?.businessCity,
        postalCode: business?.businessPostCode,
        businessName: business?.businessName,
        xeroContactId:null       
      };
      
      if (user && user.isXeroCustomer && user.xeroContactId !== null) {
        const userWithBusinessName = { ...user.toJSON(), businessName: business.businessName };
        return res.status(200).json(userWithBusinessName);
      } else {
        return res.status(200).json(paramsToCreateContact);
      }
    } catch (error) {
      console.error("Error checking Xero customer:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };