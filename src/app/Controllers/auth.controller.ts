import { genSaltSync, hashSync } from "bcryptjs";
import { validate } from "class-validator";
import { Request, Response } from "express";
import passport from "passport";

import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { RegisterInput } from "../Inputs/Register.input";
import { User } from "../Models/User";

import { UserInterface } from "../../types/UserInterface";

import { RolesEnum } from "../../types/RolesEnum";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
import { createCustomerOnRyft } from "../../utils/createCustomer/createOnRyft";
import { generateAuthToken } from "../../utils/jwt";
import { LoginInput } from "../Inputs/Login.input";
import { CheckUserInput } from "../Inputs/checkUser.input";
import { forgetPasswordInput } from "../Inputs/forgetPasswordInput";
import {
  send_email_for_registration,
  send_email_forget_password,
} from "../Middlewares/mail";
import { AdminSettings } from "../Models/AdminSettings";
// import { BusinessDetails } from "../Models/BusinessDetails";
import { ForgetPassword } from "../Models/ForgetPassword";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { PROMO_LINK } from "../../utils/Enums/promoLink.enum";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { clientTablePreference } from "../../utils/constantFiles/clientTablePreferenceAdmin";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { leadsTablePreference } from "../../utils/constantFiles/leadsTablePreferenceAdmin";
import { Admins } from "../Models/Admins";
const fs = require("fs");
class AuthController {
  static register = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;

    const registerInput = new RegisterInput();

    registerInput.firstName = input.firstName;
    registerInput.lastName = input.lastName;
    // registerInput.phoneNumber=input.phoneNumber;
    registerInput.email = input.email;
    registerInput.password = input.password;
    const errors = await validate(registerInput);
    // let Object: any = {
    //   register: [],
    // };
    const adminSettings = await AdminSettings.findOne();
    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));
      // errorsInfo.map((i) => {
      //   Object.register.push(i.property);
      // });
      return res
        .status(400)
        .json({ error: { message: "VALIDATIONS_ERROR", info: errorsInfo } });
    }
    try {
      const user = await User.findOne({ email: input.email, isDeleted:false });
      if (!user) {
        const salt = genSaltSync(10);
        const hashPassword = hashSync(input.password, salt);
        const showUsers: any = await User.findOne()
          .sort({ rowIndex: -1 })
          .limit(1);
        let checkCode;
        let codeExists;
        if (input.code) {
          checkCode = await FreeCreditsLink.findOne({ code: input.code });
          if (checkCode?.isDisabled) {
            return res.status(400).json({ data: { message: "Link Expired!" } });
          }
          if (!checkCode) {
            return res.status(400).json({ data: { message: "Link Invalid!" } });
          }
          if (
            checkCode.maxUseCounts &&
            checkCode.maxUseCounts <= checkCode.useCounts
          ) {
            return res
              .status(400)
              .json({ data: { message: "Link has reached maximum limit!" } });
          } else {
            codeExists = true;
          }
        }
        input.email = String(input.email).toLowerCase();
        let dataToSave: any = {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phoneNumber: input.phoneNumber,
          password: hashPassword,
          role: RolesEnum.USER,
          // leadCost: adminSettings?.defaultLeadAmount,
          autoChargeAmount: adminSettings?.amount,
          isActive: true, //need to delete
          isVerified: true, //need to delete
          autoCharge: true,
          rowIndex: showUsers?.rowIndex + 1 || 0,
          paymentMethod: paymentMethodEnum.MANUALLY_ADD_CREDITS_METHOD,
          onBoarding: [
            {
              key: ONBOARDING_KEYS.BUSINESS_DETAILS,
              pendingFields: [
                "businessIndustry",
                "businessName",
                "businessSalesNumber",
                "businessPostCode",
                "address1",
                "businessOpeningHours",
                "businessCity",
              ],
              dependencies: [],
            },
            {
              key: ONBOARDING_KEYS.LEAD_DETAILS,
              pendingFields: [
                "daily",
                "leadSchedule",
                "postCodeTargettingList",
              ],
              dependencies: ["businessIndustry"],
            },
            {
              key: ONBOARDING_KEYS.CARD_DETAILS,
              pendingFields: [
                // "cardHolderName",
                "cardNumber",
                // "expiryMonth",
                // "expiryYear",
                // "cvc",
              ],
              dependencies: [],
            },
          ],
        };
        if (codeExists && checkCode?.topUpAmount === 0) {
          dataToSave.premiumUser = PROMO_LINK.PREMIUM_USER_NO_TOP_UP;
          dataToSave.promoLinkId = checkCode?.id;
        } else if (codeExists && checkCode?.topUpAmount != 0) {
          dataToSave.premiumUser = PROMO_LINK.PREMIUM_USER_TOP_UP;
          dataToSave.promoLinkId = checkCode?.id;
        }
        await User.create(dataToSave);
        if (input.code) {
          const checkCode: any = await FreeCreditsLink.findOne({
            code: input.code,
          });
          const dataToSave: any = {
            isUsed: true,
            usedAt: new Date(),
            useCounts: checkCode?.useCounts + 1,
          };
          await FreeCreditsLink.findByIdAndUpdate(checkCode?.id, dataToSave, {
            new: true,
          });
        }
        send_email_for_registration(input.email, input.firstName);

        passport.authenticate(
          "local",
          { session: false },
          (err: any, user: UserInterface, message: Object): any => {
            if (!user) {
              if (err) {
                return res.status(400).json({ error: err });
              }
              return res.status(401).json({ error: message });
            } else if (!user.isActive) {
              return res
                .status(401)
                .json({ data: "User not active.Please contact admin." });
            } else if (!user.isVerified) {
              return res.status(401).json({
                data: "User not verified.Please verify your account",
              });
            } else if (user.isDeleted) {
              return res
                .status(401)
                .json({ data: "User is deleted.Please contact admin" });
            }
            const authToken = generateAuthToken(user);
            const params: Record<string, any> = {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              userId: user.id,
            };

            createCustomerOnRyft(params)
              .then(async () => {

                //@ts-ignore
                user.password = undefined;
                res.send({
                  message: "successfully registered",
                  data: user,
                  token: authToken,
                });
              })
              .catch(async () => {
                await User.findByIdAndDelete(user.id);
                return res.status(400).json({
                  data: {
                    message:
                      "Email already exist on RYFT. please try again with another email.",
                  },
                });
              });
          }
        )(req, res);
      } else {
        return res
          .status(400)
          .json({ data: { message: "User already exists with same email." } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static auth = async (req: Request, res: Response): Promise<any> => {
    const user: any = req.user;
    try {
      const exists = await User.findById(user?.id, "-password")
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")
        .populate("invitedById");
        const existsAdmin = await Admins.findById(user?.id, "-password")
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")
        .populate("invitedById");
      if (exists) {
        return res.json({ data: exists });
      }
      else if(existsAdmin){
        return res.json({ data: existsAdmin });
      }
      return res.json({ data: "User not exists" });
    } catch (error) {
      
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static login = async (req: Request, res: Response): Promise<Response> => {
    const input = req.body;
    const loginInput = new LoginInput();
    loginInput.email = input.email;
    loginInput.password = input.password;
    const errors = await validate(loginInput);

    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      return res.status(400).json({
        error: { message: "VALIDATIONS_ERROR", info: { errorsInfo } },
      });
    }

    return passport.authenticate(
      "local",
      { session: false },
      async (err: any, user: UserInterface, message: Object) => {
        if (!user) {
          if (err) {
            return res.status(400).json({ error: err });
          }
          return res.status(401).json({ error: message });
        } else if (!user.isActive && user.role===RolesEnum.USER) {
          return res.status(401).json({
            error: { message: "User not active.Please contact admin." },
          });
        } 
        else if (!user.isActive && user.role===RolesEnum.ADMIN) {
          return res.status(401).json({
            error: { message: "Admin not active.Please contact super admin." },
          });
        } else if (!user.isVerified && user.role===RolesEnum.USER) {
          return res.status(401).json({
            error: {
              message: "User not verified.Please verify your account",
            },
          });
        } else if (user.isDeleted && user.role===RolesEnum.USER) {
          return res.status(401).json({
            error: { message: "User is deleted.Please contact admin" },
          });
        }
        else if (user.isDeleted && user.role===RolesEnum.ADMIN) {
          return res.status(401).json({
            error: { message: "Admin is deleted.Please contact super admin" },
          });
        }
        const token = generateAuthToken(user);
        // const business = await BusinessDetails.findById(user.businessDetailsId);
        // const promoLink: any = await FreeCreditsLink.findOne({
        //   user: { $elemMatch: { userId: user._id } },
        // });
        //@ts-ignore
        user.password = undefined;
        return res.json({
          data: user,
          token,
        });
      }
    )(req, res);
  };

  static adminLogin = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const input = req.body;
    const loginInput = new LoginInput();
    // loginInput.salesPhoneNumber = input.salesPhoneNumber;
    loginInput.email = input.email;
    loginInput.password = input.password;
    const errors = await validate(loginInput);

    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      return res.status(400).json({
        error: { message: "VALIDATIONS_ERROR", info: { errorsInfo } },
      });
    }
    return passport.authenticate(
      "local",
      { session: false },
      async (err: any, user: UserInterface, message: Object) => {
        // const cardExist=await CardDetails.find({userId:user._id})
        if (user.role == RolesEnum.USER) {
          return res.status(400).json({
            error: { message: "kindly go to user login page to login." },
          });
        }
        if (!user) {
          if (err) {
            return res.status(400).json({ error: err });
          }
          return res.status(401).json({ error: message });
        }
        const token = generateAuthToken(user);
        return res.json({
          data: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            token,
          },
        });
      }
    )(req, res);
  };

  static checkUser = async (req: Request, res: Response): Promise<Response> => {
    const input = req.body;
    const userInput = new CheckUserInput();
    userInput.email = input.email;
    userInput.salesPhoneNumber = input.salesPhoneNumber;

    const errors = await validate(userInput);

    if (errors.length) {
      const errorsInfo: ValidationErrorResponse[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      return res.status(400).json({
        error: { message: "VALIDATIONS_ERROR", info: { errorsInfo } },
      });
    }
    const user = await User.findOne({
      $or: [
        { email: input.email },
        { completesalesPhoneNumber: input.salesPhoneNumber },
      ],
    });
    if (user) {
      return res.json({ data: { message: "User exist." } });
    } else {
      return res
        .status(400)
        .json({ data: { message: "User does not exist." } });
    }
  };

  static activeUser = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    const isActive = req.body.isActive;
    try {
      const checkUser = await User.findById(id);
      if (!checkUser) {
        return res
          .status(401)
          .json({ data: { message: "User doesn't exist." } });
      }
      const activeUser: any = await User.findByIdAndUpdate(
        id,
        {
          isActive: isActive,
          activatedAt: new Date(),
        },
        {
          new: true,
        }
      );
      const dataToShow = {
        id: activeUser.id,
        firstName: activeUser.firstName,
        lastName: activeUser.lastName,
        email: activeUser.email,
        role: activeUser.role,
        isRyftCustomer: activeUser.isRyftCustomer,
        isLeadbyteCustomer: activeUser.isLeadbyteCustomer,
        autoChargeAmount: activeUser.autoChargeAmount,
        businessDetailsId: activeUser.businessDetailsId,
        userLeadsDetailsId: activeUser.userLeadsDetailsId,
      };
      return res.json({ data: dataToShow });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static inActiveUser = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    try {
      const checkUser = await User.findById(id);
      if (!checkUser) {
        return res
          .status(401)
          .json({ data: { message: "User doesn't exist." } });
      }
      const inActiveUser = await User.findByIdAndUpdate(
        id,
        {
          isActive: false,
        },
        {
          new: true,
        }
      );
      const dataToShow = {
        id: inActiveUser?.id,
        firstName: inActiveUser?.firstName,
        lastName: inActiveUser?.lastName,
        email: inActiveUser?.email,
        role: inActiveUser?.role,
        isRyftCustomer: inActiveUser?.isRyftCustomer,
        isLeadbyteCustomer: inActiveUser?.isLeadbyteCustomer,
        autoChargeAmount: inActiveUser?.autoChargeAmount,
        businessDetailsId: inActiveUser?.businessDetailsId,
        userLeadsDetailsId: inActiveUser?.userLeadsDetailsId,
      };
      return res.json({ data: dataToShow });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static forgetPassword = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    const userInput = new forgetPasswordInput();
    userInput.email = input.email;
    const user = await User.findOne({ email: input.email });
    const admin = await Admins.findOne({ email: input.email });

    // if (user?.role == RolesEnum.SUPER_ADMIN) {
    //   return res
    //     .status(400)
    //     .json({ data: { message: "Admin cannot reset the password." } });
    // }

    if (user) {
      const salt = genSaltSync(10);
      const text = randomString(8, true);
      const hashPassword = hashSync(text, salt);
      let message = {
        name: user.firstName,
        password: text,
      };
      console.log("FORGET PASSWORD", text);
      send_email_forget_password(input.email, message);
      await ForgetPassword.create({
        userId: user.id,
        email: input.email,
        password: hashPassword,
      });
      await User.findOneAndUpdate({ _id: user }, { password: hashPassword });

      return res.json({ data: { message: "Email sent please verify!" } });
    }else if(admin){
      const salt = genSaltSync(10);
      const text = randomString(8, true);
      const hashPassword = hashSync(text, salt);
      let message = {
        name: admin.firstName,
        password: text,
      };
      console.log("FORGET PASSWORD", text);
      send_email_forget_password(input.email, message);
      await ForgetPassword.create({
        userId: admin.id,
        email: input.email,
        password: hashPassword,
      });
      await Admins.findOneAndUpdate({ _id: admin }, { password: hashPassword });

      return res.json({ data: { message: "Email sent please verify!" } });
    }
     else {
      return res
        .status(400)
        .json({ data: { message: "User does not exist." } });
    }
  };

  static showMapFile = async (req: Request, res: Response): Promise<any> => {
    try {
      fs.readFile(
        `${process.cwd()}/public/map/uk.topo.json`,
        "utf8",
        (err: any, data: any) => {
          if (err) {
            console.error(err);
            return;
          }
          data = JSON.parse(data);
          fs.readFile(
            `${process.cwd()}/public/map/data_uk_latest.json`,
            "utf8",
            (err: any, data2: any) => {
              if (err) {
                console.error(err);
                return;
              }
              data2 = JSON.parse(data2);
              // return res.json(data2);
              const object1 = data2;

              const object2: any = [];

              object1.forEach((obj: any) => {
                const districtsArray = obj.PostcodeDistrict.split(",");
                districtsArray.sort(
                  (a: any, b: any) =>
                    parseInt(a.match(/\d+/g)[0]) - parseInt(b.match(/\d+/g)[0])
                );
                const sortedDistrictsString = districtsArray.join(",");
                const newObject = {
                  Postcode: obj.Postcode,
                  PostcodeDistrict: sortedDistrictsString,
                };
                object2.push(newObject);
              });
              data.objects.Areas.geometries?.map((j: any) => {
                object2.map((i: any) => {
                  Object.assign(j.properties, {
                    LABEL: j.properties?.name,
                  });
                  if (i["Postcode"] == j.properties?.name) {
                    Object.assign(j.properties, {
                      POSTAL_CODES: i["PostcodeDistrict"].split(","),
                    });
                  }
                });
              });
              return res.json({ data: data });
            }
          );
        }
      );
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static showMapFileForIreland = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      fs.readFile(
        `${process.cwd()}/public/map/ireland.topo.json`,
        "utf8",
        (err: any, data: any) => {
          if (err) {
            console.error(err);
            return;
          }
          data = JSON.parse(data);
          fs.readFile(
            `${process.cwd()}/public/map/data_uk_latest.json`,
            "utf8",
            (err: any, data2: any) => {
              if (err) {
                console.error(err);
                return;
              }
              data2 = JSON.parse(data2);
              const object1 = data2;

              const object2: any = [];

              object1.forEach((obj: any) => {
                const districtsArray = obj.PostcodeDistrict.split(",");
                districtsArray.sort(
                  (a: any, b: any) =>
                    parseInt(a.match(/\d+/g)[0]) - parseInt(b.match(/\d+/g)[0])
                );
                const sortedDistrictsString = districtsArray.join(",");
                const newObject = {
                  Postcode: obj.Postcode,
                  PostcodeDistrict: sortedDistrictsString,
                };
                object2.push(newObject);
              });
              data.objects.IRL_adm1.geometries.map((j: any) => {
                object2.map((i: any) => {
                  Object.assign(j.properties, {
                    LABEL: j.properties?.HASC_1.split(".")[1],
                    name: j.properties?.HASC_1.split(".")[1],
                  });
                  if (i["Postcode"] == j.properties?.HASC_1.split(".")[1]) {
                    Object.assign(j.properties, {
                      POSTAL_CODES: i["PostcodeDistrict"].split(","),
                    });
                  }
                });
              });
              return res.json({ data: data });
            }
          );
        }
      );
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static returnUrlApi = async (req: Request, res: Response) => {
    const input = req;
    return res.json({ data: input });
  };

  static me = async (req: Request, res: Response): Promise<any> => {
    const user: any = req.user;
    try {
      const exists = await User.findById(user?.id, "-password")
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")
        // .populate("invitedById")
        .populate("userServiceId");
        const existsAdmin = await Admins.findById(user?.id, "-password")
      if (exists) {
        return res.json({ data: exists });
      }
      else if(existsAdmin){
        return res.json({ data: existsAdmin });
      }
      return res.json({ data: "User not exists" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
  

  static test = async (req: Request, res: Response): Promise<any> => {
    try {
      const input = req?.body;
      return res.json({ data: input });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  
  static userStatus = async (req: Request, res: Response): Promise<any> => {
    try {
      const id = req.params.id
const user=await User.findById(id,'isRyftCustomer isLeadbyteCustomer isXeroCustomer -_id')
      return res.json({ data: user });  
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static adminRegister = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    const showUsers: any = await User.findOne().sort({ rowIndex: -1 }).limit(1);
    try {
      const salt = genSaltSync(10);
      const hashPassword = hashSync(input?.password || "secret@1", salt);
      const dataToSave = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        rowIndex: showUsers?.rowIndex + 1 || 0,
        password: hashPassword,
        role: RolesEnum.ADMIN,
      };
      if (!input.firstName) {
        dataToSave.firstName = "Super";
      }
      if (!input.lastName) {
        dataToSave.lastName = "Admin";
      }
      if (!input.email) {
        dataToSave.email = "admin@example.com";
      }
      const user=await User.create(dataToSave)
      await ClientTablePreference.create({
        columns:clientTablePreference,
        userId:user.id
      })
      await LeadTablePreference.create({
        userId:user.id,
        columns:leadsTablePreference
      })
      return res.json({message:"Admin registers successfully", data:user})
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}

export { AuthController };

function randomString(length: number, isSpecial: any) {
  const normalCharacters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const specialCharacters = "@#&?/*";
  var characterList = normalCharacters;
  var result = "";
  if (isSpecial) {
    characterList += specialCharacters;
  }
  while (length > 0) {
    var index = Math.floor(Math.random() * characterList.length);
    result += characterList[index];
    length--;
  }
  return result + "$";
}
