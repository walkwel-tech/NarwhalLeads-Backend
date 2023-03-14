import { validate } from "class-validator";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { FileEnum } from "../../types/FileEnum";
import { RolesEnum } from "../../types/RolesEnum";
import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { createCustomersOnRyftAndLeadByte } from "../../utils/createCustomer";
import { signUpFlowEnums } from "../../utils/Enums/signupFlow.enum";
import { DeleteFile } from "../../utils/removeFile";
import { BusinessDetailsInput } from "../Inputs/BusinessDetails.input";
import { BusinessDetails } from "../Models/BusinessDetails";
import { User } from "../Models/User";
const ObjectId = mongoose.Types.ObjectId;

export class BusinessDetailsController {
  static create = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    const Business = new BusinessDetailsInput();
    (Business.businessIndustry = input.businessIndustry),
      (Business.businessName = input.businessName),
      //@ts-ignore
      (Business.businessLogo = req.file?.filename),
      (Business.businessSalesNumber = input.businessSalesNumber),
      (Business.businessAddress = input.businessAddress),
      (Business.businessCity = input.businessCity),
      (Business.businessCountry = input.businessCountry),
      (Business.businessPostCode = input.businessPostCode),
      (Business.businessOpeningHours = input.businessOpeningHours);
    const errors = await validate(Business);
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
      let dataToSave: any = {
        userId: input.userId,
        businessIndustry: input.businessIndustry,
        businessName: input.businessName,
        //@ts-ignore
        businessLogo: `${FileEnum.PROFILEIMAGE}${req?.file.filename}`,
        businessSalesNumber: input.businessSalesNumber,
        businessAddress: input.businessAddress,
        businessCity: input.businessCity,
        businessCountry: input.businessCountry,
        businessPostCode: input.businessPostCode,
        businessOpeningHours: input.businessOpeningHours,
      };
      const userData = await BusinessDetails.create(dataToSave);
      await User.findByIdAndUpdate(input.userId, {
        businessDetailsId: new ObjectId(userData._id),
        signUpFlowStatus: signUpFlowEnums.LEADS_DETAILS_LEFT,
      });
      const user = await User.findById(input.userId);
      res.send({
        data: userData,
      });
      const params: any = {
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        company: input.businessName,
        userId: user?._id,
        street1: input.businessAddress,
        street2: input.businessAddress,
        towncity: input.businessCity,
        // county:Name of county,
        postcode: input.businessPostCode,
        country_name: input.businessCountry,
        phone: input.businessSalesNumber,
        businessId:userData.id
      };
      createCustomersOnRyftAndLeadByte(params)
        .then(() => {
          console.log("Customer created!!!!");
        })
        .catch((ERR) => {
          console.log("ERROR while creating customer");
        });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static updateBusinessDetails = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    const { id } = req.params;
    const input = req.body;
    try {
      const details = await BusinessDetails.findOne({ _id: new ObjectId(id) });
      if (!details) {
        return res
          .status(404)
          .json({ error: { message: "details does not exists." } });
      }
      const data = await BusinessDetails.findByIdAndUpdate(
        id,
        {
          businessIndustry: input.businessIndustry
            ? input.businessIndustry
            : details.businessIndustry,
          businessName: input.businessName
            ? input.businessName
            : details.businessName,
          businessSalesNumber: input.businessSalesNumber
            ? input.businessSalesNumber
            : details.businessSalesNumber,
          businessAddress: input.businessAddress
            ? input.businessAddress
            : details.businessAddress,
          businessCity: input.businessCity
            ? input.businessCity
            : details.businessCity,
          businessCountry: input.businessCountry
            ? input.businessCountry
            : details.businessCountry,
          businessPostCode: input.businessPostCode
            ? input.businessPostCode
            : details.businessPostCode,
          businessOpeningHours: input.businessOpeningHours
            ? input.businessOpeningHours
            : details.businessOpeningHours,
          businessLogo: (req.file || {}).filename
            ? //@ts-ignore
              `${FileEnum.PROFILEIMAGE}${req?.file.filename}`
            : details.businessLogo,
        },
        {
          new: true,
        }
      );
      if (data) {
        const updatedDetails = await BusinessDetails.findById(id);
        if (req.file && details.businessLogo) {
          DeleteFile(`${details.businessLogo}`);
        }
        return res.json({
          data: {
            message: "businessDetails updated successfully.",
            data: updatedDetails,
          },
        });
      } else {
        return res.json({
          data: { message: "Incorrect input fields" },
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static show = async (req: Request, res: Response): Promise<any> => {
    try {
      const data = await BusinessDetails.find({ isDeleted: false });
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };

  static showById = async (req: Request, res: Response): Promise<any> => {
    const currentUser = req.user;
    const Id = req.params.id;
    try {
      const data = await BusinessDetails.find({
        _id: Id,
        isDeleted: false,
      });
     
      if ( //@ts-ignore
        currentUser?.role == RolesEnum.INVITED &&
           //@ts-ignore
        currentUser?.businessDetailsId != Id
      ) {
        return res
          .status(403)
          .json({
            error: { message: "You dont't have access to this resource.!" },
          });
      }
      return res.json({ data: data });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "something went wrong" } });
    }
  };

  static delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const details = await BusinessDetails.findById(id);
    if (details?.isDeleted) {
      return res
        .status(400)
        .json({ error: { message: "details has been already deleted." } });
    }

    try {
      const data = await BusinessDetails.findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
      });

      if (!data) {
        return res
          .status(400)
          .json({ error: { message: "details to delete does not exists." } });
      }

      return res.json({ message: "details deleted successfully." });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}
