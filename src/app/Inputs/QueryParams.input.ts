import {
  IsOptional,
  IsArray,
  IsMongoId,
  IsString,
  IsNumber,
} from "class-validator";
import { TimePeriod } from "./TimePeriod.input";
export class QueryParams {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  accountManagerId?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  industry?: string[];

  @IsOptional()
  timePeriod?: TimePeriod;

  @IsOptional()
  @IsString()
  commissionStatus?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  perPage?: number;
}
