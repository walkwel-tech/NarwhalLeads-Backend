import {
    IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export enum userStatus {
  ARCHIVED = "archived",
  PENDING = "pending",
  LOST = "lost",
  ACTIVE = "active",
  INACTIVE = "inActive",
  ALL = ""
}

export const ClientType = {
  BILLABLE: "billable",
  NON_BILLABLE: "nonBillable"
}

export const NULL_MANAGER = "orphanUser"



export class GetClientBodyValidator {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  perPage?: number;
  
  @IsOptional()
  @IsString()
  onBoardingPercentage?: string;
  
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"])
  sortingOrder: string;
  
  @IsOptional()
  @IsString()
  @IsIn([ClientType.BILLABLE, ClientType.NON_BILLABLE, ""])
  clientType: string;

  @IsOptional()
  // @IsMongoId()
  accountManagerId?: string;
  
  @IsOptional()
  // @IsMongoId()
  businessDetailId?: string;
  
  @IsOptional()
  // @IsMongoId()
  industryId?: string;

  @IsOptional()
  @IsEnum(userStatus)
  clientStatus?: string;
}
