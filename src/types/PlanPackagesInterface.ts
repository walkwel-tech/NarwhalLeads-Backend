import { Document } from "mongoose";

export interface PlanPackagesInterface extends Document {
  title: string;
  amountInPound: string;
  description: string;
  amountInEuro: string;
  features: [];
  popular: boolean;
  selected: boolean;
  isActive: boolean;
}
