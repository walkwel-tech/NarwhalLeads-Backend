import { Document } from "mongoose";
import { columnsObjects } from "../types/columnsInterface";

export interface BuisnessIndustriesInterface extends Document {
  industry: string;
  leadCost: number;
  columns: columnsObjects[];
  isActive: boolean;
  json: Object;
  associatedCurrency: string,
  country: string,
  isDeleted: boolean;
}
