import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";
import { leadsStatusEnums } from "../../../../utils/Enums/leads.status.enum";

export class GetLeadsQuery {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  @IsIn([...Object.keys(leadsStatusEnums), ""])
  status?: string;

  @IsOptional()
  @IsNumber()
  perPage?: number;

  @IsOptional()
  @IsNumber()
  page?: number;
}
