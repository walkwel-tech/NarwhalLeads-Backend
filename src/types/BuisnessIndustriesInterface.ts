import { Document} from "mongoose";

export interface BuisnessIndustriesInterface extends Document {
  industry:string;
  leadCost: Number;
  columns: [];
  isActive:boolean;
}