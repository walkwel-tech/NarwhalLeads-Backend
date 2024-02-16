import { IsNumber, IsOptional } from "class-validator";

export class GetBadgeListBodyValidator {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  perPage?: number;
}
