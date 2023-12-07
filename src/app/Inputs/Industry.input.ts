import { IsNotEmpty, IsString } from "class-validator";

export class IndustryInput {
  @IsNotEmpty()
  @IsString({ message: "industry is required." })

  industry: string;

  @IsString({ message: "leadCost is required." })
  @IsNotEmpty()
  leadCost: string;

  @IsNotEmpty()
  @IsString({ message: "cureency code is required." })
  currencyCode: string;

}
