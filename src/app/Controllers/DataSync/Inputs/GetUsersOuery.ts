import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export const IndustryStatus = {
  ACTIVE: "active",
  PAUSED: "paused",
};

export class GetUsersQuery {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsString()
  startTime: string;

  @IsOptional()
  @IsString()
  endTime: string;

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
