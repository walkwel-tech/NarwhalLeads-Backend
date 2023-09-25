import { Request, Response } from "express";
import { User } from "../Models/User";
import { RolesEnum } from "../../types/RolesEnum";
import { UserInterface } from "../../types/UserInterface";
import { BuisnessIndustries } from "../Models/BuisnessIndustries";
import { LeadTablePreference } from "../Models/LeadTablePreference";

export class GuestController{
    static setLeadPreferenceAccordingToIndustryInDB = async (req: Request, res: Response) => {
        try {
            const dataToFind={role:RolesEnum.USER,isDeleted:false}
            // const dataToFind={_id:"64c0aee1afbff4f9de4d3b0d"}
          const users=await User.find(dataToFind)
          users.map(async(user:UserInterface)=>{
            const industry=await BuisnessIndustries.findById(user.businessIndustryId)
            const leadPref=await LeadTablePreference.findOneAndUpdate({userId:user.id},{columns:industry?.columns})
            return leadPref
          })
          return res.json({message:"lead preference updated"})

        } catch (error) {
            return res.status(500).json({error:"something went wrong"})

        }
      };
}