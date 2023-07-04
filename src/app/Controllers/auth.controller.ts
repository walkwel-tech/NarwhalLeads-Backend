import { Request, Response } from "express";
import { validate } from "class-validator";
import passport from "passport";
import { genSaltSync, hashSync } from "bcryptjs";

import { ValidationErrorResponse } from "../../types/ValidationErrorResponse";
import { RegisterInput } from "../Inputs/Register.input";
import { User } from "../Models/User";

import { UserInterface } from "../../types/UserInterface";

import { LoginInput } from "../Inputs/Login.input";
import { generateAuthToken } from "../../utils/jwt";
import { RolesEnum } from "../../types/RolesEnum";
import { CheckUserInput } from "../Inputs/checkUser.input";
import { send_email_forget_password, send_email_for_registration } from "../Middlewares/mail";
import { ForgetPassword } from "../Models/ForgetPassword";
import { forgetPasswordInput } from "../Inputs/forgetPasswordInput";
import { AdminSettings } from "../Models/AdminSettings";
import { BusinessDetails } from "../Models/BusinessDetails";
import { AccessToken } from "../Models/AccessToken";
import {
  createContactOnXero,
  refreshToken,
} from "../../utils/XeroApiIntegration/createContact";
import { FreeCreditsLink } from "../Models/freeCreditsLink";
import { paymentMethodEnum } from "../../utils/Enums/payment.method.enum";
import { ONBOARDING_KEYS } from "../../utils/constantFiles/OnBoarding.keys";
const fs = require("fs");

class AuthController {
  static regsiter = async (req: Request, res: Response): Promise<any> => {
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
      if (input.code) {
        const checkCode = await FreeCreditsLink.findOne({ code: input.code });
        if (checkCode?.isDisabled) {
          return res.status(400).json({ data: { message: "Link Expired!" } });
        }
        if (!checkCode) {
          return res.status(400).json({ data: { message: "Link Invalid!" } });
        }
      }

      const user = await User.findOne({ email: input.email });
      if (!user) {
        const salt = genSaltSync(10);
        const hashPassword = hashSync(input.password, salt);
        const showUsers: any = await User.findOne()
          .sort({ rowIndex: -1 })
          .limit(1);
        const createdUser = await User.create({
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
          onBoarding:[ 
            {
              "key": ONBOARDING_KEYS.BUSINESS_DETAILS,
              "pendingFields": ['businessIndustry','businessName','businessSalesNumber','businessPostCode','businessLogo','address1','businessOpeningHours','businessCity'],
              "dependencies": []
          },
            {
                "key": ONBOARDING_KEYS.LEAD_DETAILS,
                "pendingFields": ['daily','leadSchedule','postCodeTargettingList'],
                "dependencies": ['businessIndustry']
            },
            {
                "key":ONBOARDING_KEYS.CARD_DETAILS,
                "pendingFields": ['cardHolderName','cardNumber','expiryMonth','expiryYear','cvc'],
                "dependencies": []
            }
        ],
        });
        if (input.code) {
          const checkCode: any = await FreeCreditsLink.findOne({
            code: input.code,
          });
          const dataToSave: any = {
            isUsed: true,
            $push: { user: { userId: createdUser.id } },
            usedAt: new Date(),
            useCounts: checkCode?.useCounts + 1,
          };
          await FreeCreditsLink.findByIdAndUpdate(checkCode?.id, dataToSave);
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
            const token = generateAuthToken(user);
            res.send({
              message: "successfully registered",
              data: {
                _id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                credits: adminSettings?.amount,
                token
              },
            });
           

          }
        )(req, res);
        const token: any = await AccessToken.findOne();
        const fullName = input.firstName + " " + input.lastName;
        createContactOnXero(fullName, token?.access_token)
          .then(async (res: any) => {
            await User.findOneAndUpdate(
              { email: input.email },
              { $set: { xeroContactId: res.data.Contacts[0].ContactID } }
            );
            console.log("success in creating contact");
          })
          .catch((err) => {
            refreshToken().then(async (res: any) => {
              console.log("Token updated while creating customer!!!")
              createContactOnXero(fullName, res.data.access_token).then(
                async (res: any) => {
                  await User.findOneAndUpdate(
                    { email: input.email },
                    { $set: { xeroContactId: res.data.Contacts[0].ContactID } }
                  );
                  console.log("success in creating contact");
                }
              ).catch((error)=>{
                console.log("ERROR IN CREATING CUSTOMER AFTER TOKEN UPDATION.")
              });
            }).catch((err)=>{
                          console.log("error in creating contact on xero",err.response.data);

            });
          });
      } else {
        return res
          .status(400)
          .json({ data: { message: "User already exists with same email." } });
      }
    } catch (error) {
      console.log(error);
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
      if (exists) {
        return res.json({ data: exists });
      }
      return res.json({ data: "User not exists" });
    } catch (error) {
      console.log(error);
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
        } else if (!user.isActive) {
          return res.status(401).json({
            error: { message: "User not active.Please contact admin." },
          });
        } else if (!user.isVerified) {
          return res.status(401).json({
            error: {
              message: "User not verified.Please verify your account",
            },
          });
        } else if (user.isDeleted) {
          return res.status(401).json({
            error: { message: "User is deleted.Please contact admin" },
          });
        }
        const token = generateAuthToken(user);
        const business = await BusinessDetails.findById(user.businessDetailsId);
        const promoLink: any = await FreeCreditsLink.findOne({
          user: { $elemMatch: { userId: user._id } },
        });
        return res.json({
          data: {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            credits: user.credits,
            onBoarding:user?.onBoarding,
            businessName: business?.businessName,
            topUpAmount: promoLink?.topUpAmount || null,
            freeCredits: promoLink?.freeCredits || null,
            token,
          },
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
      const activeUser = await User.findByIdAndUpdate(
        id,
        {
          isActive: isActive,
          activatedAt: new Date(),
        },
        {
          new: true,
        }
      );
      return res.json({ data: activeUser });
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
      return res.json({ data: inActiveUser });
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
    if (user?.role == RolesEnum.ADMIN) {
      return res
        .status(400)
        .json({ data: { message: "Admin cannot reset the password." } });
    }

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

  // static showMapFileForLabel = async (req: Request, res: Response): Promise<any> => {
  //   try {
  //     let a:any=[]
  //     fs.readFile(
  //       `${process.cwd()}/public/map/uk.topo.json`,
  //       "utf8",
  //       (err: any, data: any) => {
  //         if (err) {
  //           console.error(err);
  //           return;
  //         }
  //         data = JSON.parse(data);
  //         fs.readFile(
  //           `${process.cwd()}/public/map/data.json`,
  //           "utf8",
  //           (err: any, data2: any) => {
  //             if (err) {
  //               console.error(err);
  //               return;
  //             }
  //             data2 = JSON.parse(data2);
  //             data.objects.GBR_adm2.geometries.map((j: any) => {
  //               data2.map((i: any) => {
  //                 if (
  //                   i["Postcode Area"] == j.properties?.HASC_2.split(".")[1]
  //                 ) {
  //                   const obj={}
  //                   Object.assign(obj, {
  //                     Id: j.properties?.ID_2,
  //                   });
  //                   a.push(obj)
  //                 }
  //               });
  //             });
  //             return res.json({ data: a });
  //           }
  //         );
  //       }
  //     );
  //   } catch (err) {
  //     return res
  //       .status(500)
  //       .json({ error: { message: "Something went wrong." } });
  //   }
  // };

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
