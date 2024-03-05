import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class IndustryInput {
  @IsNotEmpty()
  @IsString({ message: "industry is required." })
  industry: string;

  @IsString({ message: "leadCost is required." })
  @IsNotEmpty()
  leadCost: string;
  currencyCode: string;

  @IsNotEmpty()
  @IsNumber()
  avgConversionRate: number;

  @IsNumber()
  @IsOptional()
  minimumTopupLeads: number;

  buyerQuestions: BuyerQuestionInput[];
}
export class BuyerQuestionInput {
  @IsString()
  title: string;

  questionSlug: string;
}
