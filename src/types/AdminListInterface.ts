import { Document } from "mongoose";
import { RolesEnum } from "./RolesEnum";

export interface AdminsListInterface extends Document {
  firstName:string
  lastName:string
  email:string;
  role:RolesEnum;
  isDeleted:boolean;
}
