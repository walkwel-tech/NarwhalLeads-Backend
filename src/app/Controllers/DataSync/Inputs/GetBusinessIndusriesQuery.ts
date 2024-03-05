import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export const IndustryStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
};

export class GetBusinessIndustriesQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    IndustryStatus.ACTIVE,
    IndustryStatus.PAUSED,
    "",
  ])
  status: string;

  @IsOptional()
  @IsNumber()
  page?: number;
  
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;



  @IsOptional()
  @IsNumber()
  perPage?: number;
}
