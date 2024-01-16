import { IsOptional, IsInt, IsPositive, IsArray, IsString } from "class-validator";

export class PostcodeAnalyticsValidator {
  @IsOptional()
  @IsInt()
  @IsPositive()
  perPage: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  page: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industry: string[];

  @IsOptional()
  @IsString()
  search: string;
}
