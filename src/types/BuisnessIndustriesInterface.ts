import { Document} from "mongoose";
import { columnsObjects } from "../types/columnsInterface";

export interface BuisnessIndustriesInterface extends Document {
  industry:string;
  leadCost: Number;
  columns: columnsObjects[];
  isActive:boolean;
}