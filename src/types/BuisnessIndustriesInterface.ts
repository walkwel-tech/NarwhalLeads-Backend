import {Document} from "mongoose";
import {SupplierBadgeIndustryConfig} from "../types/SupplierBadgeIndustryConfig";
import {columnsObjects} from "../types/columnsInterface";
interface BuyerQuestion {
  title: string;
  questionSlug: string;
  answer?: string | null
}

export interface BuisnessIndustriesInterface extends Document {
  industry: string;
  industryUrl: string;

  leadCost: number;
  columns: columnsObjects[];
  isActive: boolean;
  json: Object;
  isDeleted: boolean;
  associatedCurrency: string;
  country: string;
  avgConversionRate: number;

  // TODO: Add the following fields
  supplierBadges: SupplierBadgeIndustryConfig[];
  minimumTopupLeads: number;
  buyerQuestions: BuyerQuestion[];

}
