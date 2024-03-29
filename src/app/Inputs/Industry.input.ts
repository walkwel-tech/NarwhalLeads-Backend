import {IsNotEmpty, IsNumber, IsOptional, IsString} from "class-validator";

export class IndustryInput {
    @IsNotEmpty()
    @IsString({message: "Industry is required."})
    industry: string;

    @IsNotEmpty()
    @IsString({message: "Industry Url is required."})
    industryUrl: string;

    @IsOptional()
    @IsString({message: "Central Industry ID is for Sync."})
    centralIndustryId: string;

    @IsString({message: "Lead Cost is required."})
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

    @IsString()
    columnName: string;

    questionSlug: string;
}
