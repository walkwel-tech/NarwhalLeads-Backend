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
import {
  ONBOARDING_KEYS,
  ONBOARDING_PERCENTAGE,
} from "../../utils/constantFiles/OnBoarding.keys";
import { createCustomerOnRyft } from "../../utils/createCustomer/createOnRyft";
import { generateAuthToken } from "../../utils/jwt";
import { LoginInput } from "../Inputs/Login.input";
import { CheckUserInput } from "../Inputs/checkUser.input";
import { forgetPasswordInput } from "../Inputs/forgetPasswordInput";
import {
  sendEmailForRegistration,
  sendEmailForgetPassword,
} from "../Middlewares/mail";
import { ForgetPassword } from "../Models/ForgetPassword";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { PROMO_LINK } from "../../utils/Enums/promoLink.enum";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";
import { clientTablePreference } from "../../utils/constantFiles/clientTablePreferenceAdmin";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { order } from "../../utils/constantFiles/businessIndustry.orderList";
import * as fs from "fs";
import { freeCreditsLinkInterface } from "../../types/FreeCreditsLinkInterface";
import {
  BUSINESS_DETAILS,
  CARD_DETAILS,
  LEAD_DETAILS,
} from "../../utils/constantFiles/signupFields";
import { CreateCustomerInput } from "../Inputs/createCustomerOnRyft&Lead.inputs";
import { BusinessDetails } from "../Models/BusinessDetails";
import { createCustomersOnRyftAndLeadByte } from "../../utils/createCustomer";
import { Permissions } from "../Models/Permission";
import { CARD } from "../../utils/Enums/cardType.enum";
import { createCustomerOnStripe } from "../../utils/createCustomer/createOnStripe";
import { Types } from "mongoose";
import { getAccountManagerForRoundManager } from "../../utils/Functions/getAccountManagerForRoundManager";
import { DEFAULT } from "../../utils/constantFiles/user.default.values";

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
        email: input.email,
        isDeleted: false,
        role: {
          $in: [
            RolesEnum.USER,
            RolesEnum.ACCOUNT_MANAGER,
            RolesEnum.ADMIN,
            RolesEnum.SUBSCRIBER,
            RolesEnum.NON_BILLABLE,
            RolesEnum.INVITED,
            RolesEnum.SUPER_ADMIN,
          ],
        },
      });
      if (!user) {
        const salt = genSaltSync(10);
        const hashPassword = hashSync(input.password, salt);
        const showUsers: UserInterface =
          (await User.findOne().sort({ rowIndex: -1 }).limit(1)) ??
          ({} as UserInterface);
        let checkCode;
        let codeExists;
        if (input.code) {
          checkCode = await FreeCreditsLink.findOne({
            code: input.code,
            isDeleted: false,
          });
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
        const permission = await Permissions.findOne({ role: RolesEnum.USER });
        let dataToSave: Partial<UserInterface> = {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phoneNumber: input.phoneNumber,
          smsPhoneNumber: input.phoneNumber,
          password: hashPassword,
          role: RolesEnum.USER,
          autoChargeAmount: DEFAULT.AUTO_CHARGE_AMOUNT,
          isActive: true, //need to delete
          isVerified: true, //need to delete
          rowIndex: showUsers?.rowIndex + 1 || 0,
          paymentMethod: paymentMethodEnum.AUTOCHARGE_METHOD,
          onBoardingPercentage: ONBOARDING_PERCENTAGE.USER_DETAILS,
          onBoarding: [
            {
              key: ONBOARDING_KEYS.BUSINESS_DETAILS,
              pendingFields: [
                BUSINESS_DETAILS.BUSINESS_INDUSTRY,
                BUSINESS_DETAILS.BUSINESS_NAME,
                BUSINESS_DETAILS.BUSINESS_SALES_NUMBER,
                BUSINESS_DETAILS.BUSINESS_POST_CODE,
                BUSINESS_DETAILS.ADDRESS1,
                BUSINESS_DETAILS.BUSINESS_OPENING_HOURS,
                BUSINESS_DETAILS.BUSINESS_CITY,
              ],
              dependencies: [],
            },
            {
              key: ONBOARDING_KEYS.LEAD_DETAILS,
              pendingFields: [
                LEAD_DETAILS.DAILY,
                LEAD_DETAILS.LEAD_SCHEDULE,
                LEAD_DETAILS.POSTCODE_TARGETTING_LIST,
              ],
              dependencies: [BUSINESS_DETAILS.BUSINESS_INDUSTRY],
            },
            {
              key: ONBOARDING_KEYS.CARD_DETAILS,
              pendingFields: [CARD_DETAILS.CARD_NUMBER],
              dependencies: [],
            },
          ],
          permissions: permission?.permissions,
          triggerAmount: DEFAULT.TRIGGER_AMOUT,
          isNewUser: true,
          isAutoChargeEnabled: true,
        };
        if (codeExists && checkCode && checkCode?.topUpAmount === 0) {
          dataToSave.premiumUser = PROMO_LINK.PREMIUM_USER_NO_TOP_UP;
          dataToSave.promoLinkId = checkCode?.id;
          dataToSave.isCommissionedUser = checkCode?.isComission;
          if (checkCode.accountManager) {
            dataToSave.accountManager = checkCode.accountManager;
          }
        } else if (codeExists && checkCode && checkCode?.topUpAmount != 0) {
          dataToSave.premiumUser = PROMO_LINK.PREMIUM_USER_TOP_UP;
          dataToSave.promoLinkId = checkCode?.id;
          dataToSave.isCommissionedUser = checkCode?.isComission;
          if (checkCode.accountManager) {
            dataToSave.accountManager = checkCode.accountManager;
          }
        } else {
          if (process.env.isRoundTableManager) {
            dataToSave.accountManager =
              await getAccountManagerForRoundManager();
          }
        }

        await User.create(dataToSave);
        if (input.code) {
          const checkCode: freeCreditsLinkInterface =
            (await FreeCreditsLink.findOne({
              code: input.code,
              isDeleted: false,
            })) ?? ({} as freeCreditsLinkInterface);
          const dataToSave: Partial<freeCreditsLinkInterface> = {
            isUsed: true,
            usedAt: new Date(),
            useCounts: checkCode?.useCounts + 1,
          };
          await FreeCreditsLink.findByIdAndUpdate(checkCode?.id, dataToSave, {
            new: true,
          });
        }
        sendEmailForRegistration(input.email, input.firstName);

        passport.authenticate(
          "local",
          { session: false },
          (err: any, user: UserInterface, message: Object): any => {
            if (!user) {
              if (err) {
                return res.status(400).json({ error: err });
              }
              return res.status(550).json({ error: message });
            } else if (!user.isActive) {
              return res
                .status(550)
                .json({ data: "User not active.Please contact admin." });
            } else if (!user.isVerified) {
              return res.status(550).json({
                data: "User not verified.Please verify your account",
              });
            } else if (user.isDeleted) {
              return res
                .status(550)
                .json({ data: "User is deleted.Please contact admin" });
            }
            const authToken = generateAuthToken(user);
            const params: Record<string, string | Types.ObjectId> = {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              userId: user.id,
            };
            if (process.env.PAYMENT_MODE === CARD.STRIPE) {
              //fixme:
              //@ts-ignore
              createCustomerOnStripe(params)
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
                      message: "Error while creating customer on stripe",
                    },
                  });
                });
            } else {
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
    const user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
    try {
      const exists = await User.findById(user?.id, "-password")
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")
        .populate("invitedById");

      if (exists) {
        return res.json({ data: exists });
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
          return res.status(550).json({ error: message });
        } else if (!user.isActive && user.role === RolesEnum.USER) {
          return res.status(550).json({
            error: { message: "User not active.Please contact admin." },
          });
        } else if (!user.isActive && user.role === RolesEnum.ADMIN) {
          return res.status(550).json({
            error: { message: "Admin not active.Please contact super admin." },
          });
        } else if (!user.isActive && user.role === RolesEnum.ACCOUNT_MANAGER) {
          return res.status(550).json({
            error: { message: "Admin not active.Please contact super admin." },
          });
        } else if (!user.isVerified && user.role === RolesEnum.USER) {
          return res.status(550).json({
            error: {
              message: "User not verified.Please verify your account",
            },
          });
        } else if (user.isDeleted && user.role === RolesEnum.USER) {
          return res.status(550).json({
            error: { message: "User is deleted.Please contact admin" },
          });
        } else if (user.isDeleted && user.role === RolesEnum.ADMIN) {
          return res.status(550).json({
            error: { message: "Admin is deleted.Please contact super admin" },
          });
        } else if (user.isDeleted && user.role === RolesEnum.ACCOUNT_MANAGER) {
          return res.status(550).json({
            error: { message: "Admin is deleted.Please contact super admin" },
          });
        }
        const token = generateAuthToken(user);

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
          return res.status(550).json({ error: message });
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
          .status(550)
          .json({ data: { message: "User doesn't exist." } });
      }
      const activeUser: UserInterface =
        (await User.findByIdAndUpdate(
          id,
          {
            isActive: isActive,
            activatedAt: new Date(),
          },
          {
            new: true,
          }
        )) ?? ({} as UserInterface);
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
          .status(550)
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

    if (user) {
      const salt = genSaltSync(10);
      const text = randomString(8, true);
      const hashPassword = hashSync(text, salt);
      let message = {
        name: user.firstName,
        password: text,
      };
      console.log("forget password", text);
      sendEmailForgetPassword(input.email, message);
      await ForgetPassword.create({
        userId: user.id,
        email: input.email,
        password: hashPassword,
      });
      await User.findOneAndUpdate({ _id: user }, { password: hashPassword });

      return res.json({ data: { message: "Email sent please verify!" } });
    } else {
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

  static me = async (req: Request, res: Response): Promise<any> => {
    const user: Partial<UserInterface> = req.user ?? ({} as UserInterface);
    try {
      const exists = await User.findById(user?.id, "-password")
        .populate("businessDetailsId")
        .populate("userLeadsDetailsId")
        // .populate("invitedById")
        .populate("userServiceId");
      if (exists) {
        return res.json({ data: exists });
      }

      return res.json({ data: "User not exists" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static userStatus = async (req: Request, res: Response): Promise<any> => {
    try {
      const id = req.params.id;
      const user = await User.findById(
        id,
        "isRyftCustomer isLeadbyteCustomer isXeroCustomer -_id isStripeCustomer"
      );
      return res.json({ data: user });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static adminRegister = async (req: Request, res: Response): Promise<any> => {
    const input = req.body;
    const showUsers: UserInterface =
      (await User.findOne().sort({ rowIndex: -1 }).limit(1)) ??
      ({} as UserInterface);
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
      const user = await User.create(dataToSave);
      await ClientTablePreference.create({
        columns: clientTablePreference,
        userId: user.id,
      });
      await LeadTablePreference.create({
        userId: user.id,
        columns: order,
      });
      return res.json({ message: "Admin registers successfully", data: user });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static createCustomerOnRyft = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const input = req.body;
      const params = {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        userId: input.userId,
      };
      if (!input.email) {
        return res
          .status(400)
          .json({ error: { message: "email is required" } });
      }
      await createCustomerOnRyft(params);

      const data = await User.findById(input.userId);
      return res.json({ data: data });
    } catch (error) {
      if (error.errors) {
        return res
          .status(400)
          .json({ error: { message: "Email already exist" } });
      } else {
        return res
          .status(500)
          .json({ error: { message: "Something went wrong.", error } });
      }
    }
  };

  static createCustomerOnLeadByte = async (
    req: Request,
    res: Response
  ): Promise<any> => {
    try {
      const input = req.body;
      if (!input.email) {
        return res
          .status(400)
          .json({ error: { message: "email is required" } });
      }
      const user: UserInterface | null = await User.findOne(input.email);
      if (user) {
        const business = await BusinessDetails.findById(user.businessDetailsId);
        const params: CreateCustomerInput = {
          email: user?.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          company: input.businessName || business?.businessName,
          userId: user?._id,
          street1: input?.businessAddress || business?.businessAddress,
          street2: input?.businessAddress || business?.businessAddress,
          towncity: input?.businessCity || business?.businessCity,
          // county:Name of county,
          postcode: input?.businessPostCode || business?.businessPostCode,
          // country_name: input.businessCountry,
          phone: input?.businessSalesNumber || business?.businessSalesNumber,
          businessId: business?.id,
          country_name: "",
        };
        createCustomersOnRyftAndLeadByte(params)
          .then(() => {
            console.log("Customer created!!!!");
          })
          .catch((ERR) => {
            console.log("error while creating customer");
          })
          .finally(async () => {
            const data = await User.findById(user.id);
            return res.json({ data: data });
          });
      } else {
        return res.status(400).json({ error: { message: "User Not Found" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong.", error } });
    }
  };

  static impersonate = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      let id = req?.params?.id;

      let user = await User.findById(id);

      if (!user) {
        return res.send(400).json({ message: "username doesn't exist" });
      }

      const token = generateAuthToken(user);

      return res.json({
        data: user,
        token,
        url: `/impersonate-login?access_token=${token}`,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static promoLink = async (req: Request, res: Response): Promise<any> => {
    const code = req.query.code;

    try {
      const exists = await FreeCreditsLink.findOne(
        { code: code, isDeleted: false },
        "code businessIndustryId"
      ).populate("businessIndustryId", "industry");

      if (exists) {
        return res.json({ data: exists });
      }

      return res.json({ data: "Code not exists" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
}

export { AuthController };

function randomString(length: number, isSpecial: boolean) {
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
