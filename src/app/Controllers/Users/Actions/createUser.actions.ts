import { Request, Response } from "express";

import { RegisterInput } from "../../../Inputs/Register.input";
import { ValidationErrorResponse } from "../../../../types/ValidationErrorResponse";
import { validate } from "class-validator";
import { User } from "../../../Models/User";
import { genSaltSync, hashSync } from "bcryptjs";
import { RolesEnum } from "../../../../types/RolesEnum";
import { createContact } from "../../../../utils/sendgrid/createContactSendgrid";
import { SENDGRID_STATUS_PERCENTAGE } from "../../../../utils/constantFiles/sendgridStatusPercentage";
import { updateUserSendgridJobIds } from "../../../../utils/sendgrid/updateSendgridJobIds";

export const createUserAction = async (req: Request, res: Response): Promise<Response> => {
    const input = req.body;
    const registerInput = new RegisterInput();

    registerInput.firstName = input.firstName;
    registerInput.lastName = input.lastName;
    registerInput.email = input.email;
    registerInput.password = input.password;

    const errors = await validate(registerInput);
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
      const user = await User.findOne({
        $or: [
          { email: input.email },
          { salesPhoneNumber: input.salesPhoneNumber },
        ],
      });
      if (!user) {
        const salt = genSaltSync(10);
        const hashPassword = hashSync(input.password, salt);
        let dataToSave: any = {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: hashPassword,
          role: RolesEnum.USER,
          salesPhoneNumber: input.salesPhoneNumber,
          country: input.country,
          address: input.address,
          city: input.city,
          postCode: input.postCode,
          companyName: input.companyName,
          companyUSPs: input.companyUSPs,
          isActive: true, //need to delete
          isVerified: true, //need to delete
        };

        const userData = await User.create(dataToSave);
        if (process.env.SENDGRID_API_KEY) {

          const sendgridResponse = await createContact(userData.email, {
            signUpStatus: SENDGRID_STATUS_PERCENTAGE.USER_SIGNUP_PERCENTAGE,
            businessIndustry: SENDGRID_STATUS_PERCENTAGE.BUSINESS_INDUSTRY
          })
          const jobId = sendgridResponse?.body?.job_id;
          await updateUserSendgridJobIds(userData.id, jobId);
        }

        return res.json({
          data: {
            user: {
              _id: userData.id,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              role: userData.role,
            },
          },
        });
      } else {
        return res.status(400).json({
          data: {
            message: "User already exists with same email or phone number.",
          },
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };