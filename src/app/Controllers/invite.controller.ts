import { genSaltSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { RolesEnum } from "../../types/RolesEnum";
import { send_email_to_invited_admin, send_email_to_invited_user } from "../Middlewares/mail";
import { LeadTablePreference } from "../Models/LeadTablePreference";
import { User } from "../Models/User";
import { SubscriberList } from "../Models/SubscriberList";
import { Admins } from "../Models/Admins";
import { ClientTablePreference } from "../Models/ClientTablePrefrence";

const LIMIT = 10;
export class invitedUsersController {
  static create = async (_req: Request, res: Response) => {
    const input = _req.body;
    //@ts-ignore
    const user = await User.findById(_req.user?.id).populate(
      "businessDetailsId"
    );
    try {
      const checkExist = await User.findOne({
        //@ts-ignore
        invitedById: _req?.user?.id,
        email: input.email,
      });
      if (checkExist) {
        return res
          .status(400)
          .json({ error: { message: "User already invited" } });
      }
      const existingCustomerCheck = await User.findOne({
        email: input.email,
      });
      if (existingCustomerCheck) {
        return res
          .status(400)
          .json({ error: { message: "Already a member of this portal" } });
      } else {
        const salt = genSaltSync(10);
        const text = randomString(8, true);
        console.log("🚀 PASSWORD --->", text);
        const credentials = {
          email: input.email,
          password: text,
          name: input?.firstName + " "+input?.lastName,
            //@ts-ignore
          businessName:user?.businessDetailsId?.businessName
        };
        send_email_to_invited_user(input.email, credentials);
        const hashPassword = hashSync(text, salt);
        //@ts-ignore
        const allInvites = await User.findOne({ invitedById: _req?.user?.id })
          .sort({ rowIndex: -1 })
          .limit(1);
        const dataToSave = {
          firstName: input.firstName,
          lastName:input.lastName,
          email: input.email,
          password: hashPassword,
          role: RolesEnum.INVITED,
          //@ts-ignore
          invitedById: _req.user._id,
          businessDetailsId: user?.businessDetailsId,
          userLeadsDetailsId: user?.userLeadsDetailsId,
          isActive: true,
          isVerified: true,
          //@ts-ignore
          rowIndex: allInvites?.rowIndex + 1 || 0,
          credits:user?.credits
        };

        const data = await User.create(dataToSave);
        const leadPrefrence = await LeadTablePreference.findOne({
          //@ts-ignore

          userId: _req?.user?.id,
        });
        if (leadPrefrence) {
          await LeadTablePreference.create({
            userId: data.id,
            columns: leadPrefrence.columns,
          });
        }
        return res.json({ data: data });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static show = async (_req: Request, res: Response) => {
    //@ts-ignore
    const user = _req.user?._id;
    //@ts-ignore
    const perPage = _req.query && _req.query.perPage > 0 ? parseInt(_req.query.perPage) : LIMIT;
          //@ts-ignore
    let skip = (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) * perPage;
      let dataToFind: any = {
        invitedById: user,
        role:RolesEnum.INVITED,
        isDeleted: false,
        // isActive: JSON.parse(isActive?.toLowerCase()),
      };
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            //$options : 'i' used for case insensitivity search
            { email: { $regex: _req.query.search, $options: "i" } },
            { firstName: { $regex: _req.query.search, $options: "i" } },
            { lastName: { $regex: _req.query.search, $options: "i" } },
            { buyerId: { $regex: _req.query.search, $options: "i" } },
            {
              "businessDetailsId.businessName": {
                $regex: _req.query.search,
                $options: "i",
              },
            },
          ],
        };
        skip = 0;
      }
    try {
      const invitedUsers = await User.find(dataToFind,'-password').populate("invitedById").sort({createdAt:-1}).skip(skip).limit(perPage);

      // if (invitedUsers.length == 0) {
        // return res.json({ error: { message: "No Data Found" } });
      // } else {
        return res.json({ data: invitedUsers });
      // }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static delete = async (_req: Request, res: Response) => {
    //@ts-ignore
    const id = _req.params.id;
    //@ts-ignore
    const user = _req.user?._id;
    try {
      const invitedUsers = await User.find({
        invitedById: user,
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No User Found" } });
      } else {
        await User.findByIdAndUpdate(id, { isDeleted: true });
        return res.json({ data: { message: "User Deleted!" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static update = async (_req: Request, res: Response) => {
    //@ts-ignore
    const id = _req.params.id;
    //@ts-ignore
    const user = _req.user?._id;
    const input=_req.body
    try {
      const invitedUsers = await User.find({
        invitedById: user,
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No User Found" } });
      } else {
        const user=await User.findByIdAndUpdate(id,input,{new:true});

        return res.json({ data: user  });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static addSubscribers = async (_req: Request, res: Response) => {
    const input = _req.body;

    try {
   const data=await SubscriberList.find({email:input.email, isDeleted:false})
   if(data.length>0){
    return res.status(400).json({error:{message:"Subscriber already exist"}})
   }
   else{
   const data= await SubscriberList.create(input)
   return res.json({data:data})
   }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." ,error} });
    }
  };

  static deleteSubscriber = async (_req: Request, res: Response) => {
    //@ts-ignore
    const id = _req.params.id;

    try {
      const invitedUsers = await SubscriberList.find({
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No Subscriber Found" } });
      } else {
        await SubscriberList.findByIdAndUpdate(id, { isDeleted: true });
        return res.json({ data: { message: "Subscriber Deleted!" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static indexSubscriber = async (_req: Request, res: Response) => {
    //@ts-ignore
    const user = _req.user?._id;
    //@ts-ignore
    const perPage = _req.query && _req.query.perPage > 0 ? parseInt(_req.query.perPage) : LIMIT;
          //@ts-ignore
    let skip = (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) * perPage;
      let dataToFind: any = {
        isDeleted: false,
        // isActive: JSON.parse(isActive?.toLowerCase()),
      };
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            //$options : 'i' used for case insensitivity search
            { email: { $regex: _req.query.search, $options: "i" } },
            { firstName: { $regex: _req.query.search, $options: "i" } },
            { lastName: { $regex: _req.query.search, $options: "i" } },
          ],
        };
        skip = 0;
      }
    try {
      const invitedUsers = await SubscriberList.find(dataToFind).sort({createdAt:-1}).skip(skip).limit(perPage);

      // if (invitedUsers.length == 0) {
        // return res.json({ error: { message: "No Data Found" } });
      // } else {
        return res.json({ data: invitedUsers });
      // }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." ,error} });
    }
  };

  static addAdmins = async (_req: Request, res: Response) => {
    const input = _req.body;
    input.email = String(input.email).toLowerCase();
    try {
   const data=await Admins.find({email:input.email, isDeleted:false})
   const user=await User.find({email:input.email,isDeleted:false})
   if(data.length>0){
    return res.status(400).json({error:{message:"Admin already exist"}})
   }
   else if(user.length>0){
    return res.status(400).json({error:{message:"Email already registered with an User."}})
   }
   else{
    const salt = genSaltSync(10);
    const text = randomString(8, true);
    const dataToSend={
      name:input.firstName + " " + input.lastName,
      password:text
    }
    const hashPassword = hashSync(text, salt);
    input.password=hashPassword
    send_email_to_invited_admin(input.email,dataToSend)
     const data= await Admins.create(input)
     const adminExist:any=await User.findOne({role:RolesEnum.SUPER_ADMIN})
     const adminPref:any= await LeadTablePreference.findOne({userId:adminExist.id})
     const adminClientPref:any= await ClientTablePreference.findOne({userId:adminExist._id})
     await LeadTablePreference.create({userId:data.id,columns:adminPref.columns})
 await ClientTablePreference.create({columns:adminClientPref.columns, userId:data.id})
   const show=await Admins.findById(data.id,'-password')
   return res.json({data:show})
   }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." ,error} });
    }
  };

  static deleteAdmin = async (_req: Request, res: Response) => {
    //@ts-ignore
    const id = _req.params.id;

    try {
      const invitedUsers = await Admins.find({
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No Admin Found" } });
      } else {
        await Admins.findByIdAndUpdate(id, { isDeleted: true });
        return res.json({ data: { message: "Admin Deleted!" } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };

  static indexAdmin = async (_req: Request, res: Response) => {
    //@ts-ignore
    const user = _req.user?._id;
    //@ts-ignore
    const perPage = _req.query && _req.query.perPage > 0 ? parseInt(_req.query.perPage) : LIMIT;
          //@ts-ignore
    let skip = (_req.query && _req.query.page > 0 ? parseInt(_req.query.page) - 1 : 0) * perPage;
      let dataToFind: any = {
        isDeleted: false,
        // isActive: JSON.parse(isActive?.toLowerCase()),
      };
      if (_req.query.search) {
        dataToFind = {
          ...dataToFind,
          $or: [
            //$options : 'i' used for case insensitivity search
            { email: { $regex: _req.query.search, $options: "i" } },
            { firstName: { $regex: _req.query.search, $options: "i" } },
            { lastName: { $regex: _req.query.search, $options: "i" } },
          ],
        };
        skip = 0;
      }
    try {
      const invitedUsers = await Admins.find(dataToFind,'-password').sort({createdAt:-1}).skip(skip).limit(perPage);

      // if (invitedUsers.length == 0) {
        // return res.json({ error: { message: "No Data Found" } });
      // } else {
        return res.json({ data: invitedUsers });
      // }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." ,error} });
    }
  };

  static updateAdmin = async (_req: Request, res: Response) => {
    //@ts-ignore
    const id = _req.params.id;
const input=_req.body
    try {
      const invitedUsers = await Admins.find({
        _id: id,
        isDeleted: false,
      });

      if (invitedUsers.length == 0) {
        return res.status(400).json({ error: { message: "No Admin Found" } });
      } else {
        await Admins.findByIdAndUpdate(id, input,{new:true});
        const data=await Admins.findById(id,'-password')
        return res.json({ data: { message: "Admin Updated!", data:data } });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: { message: "Something went wrong." } });
    }
  };
  
}

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
    // Pick random index from characterList
    var index = Math.floor(Math.random() * characterList.length);
    result += characterList[index];
    length--;
  }
  return result + "$";
}
