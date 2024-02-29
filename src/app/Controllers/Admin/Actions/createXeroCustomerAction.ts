import { AccessTokenInterface } from "../../../../types/AccessTokenInterface";
import { createContactOnXero, refreshToken } from "../../../../utils/XeroApiIntegration/createContact";
import { AccessToken } from "../../../Models/AccessToken";
import { BusinessDetails } from "../../../Models/BusinessDetails";
import { User } from "../../../Models/User";
import { Request, Response } from "express";


export const createCustomerOnXero = async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User Not Found" });
      }

      const business = await BusinessDetails.findById(user?.businessDetailsId);

      if (!business) {
        throw new Error("Business Not Found for the user");
      }

      const paramsToCreateContact = {
        name: user.firstName + " " + user.lastName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        addressLine1: business?.businessName,
        addressLine2: business?.address1 + " " + business?.address2,
        city: business?.businessCity,
        postalCode: business?.businessPostCode,
        businessName: business?.businessName,
      };

      const token: AccessTokenInterface =
        (await AccessToken.findOne()) || ({} as AccessTokenInterface);

      let response: any;

      try {
        response = await createContactOnXero(paramsToCreateContact, token.access_token);
      } catch (error) {
        const refreshedToken = await refreshToken();
        if (typeof refreshedToken === 'string') {
          response = await createContactOnXero(paramsToCreateContact, refreshedToken);
        } else {
          throw new Error("Refreshed token is not a valid string");
        }
      }

      await User.findOneAndUpdate(
        { email: user.email },
        {
          xeroContactId: response.data.Contacts[0].ContactID,
          isXeroCustomer: true,
        },
        { new: true }
      );

      console.log("success in creating contact", new Date(), "Today's Date");
      return res.status(200).json({ message: "Contact created successfully" });
    } catch (error) {
      console.error("Error creating customer on Xero:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };