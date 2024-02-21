import { IsOptional, IsString, IsBoolean } from "class-validator";

export class FreeCreditLinkContentValidator {
  @IsString()
  promoLink: string;

  @IsOptional()
  @IsString()
  heroSection?: string;

  @IsOptional()
  @IsString()
  badgeTitle?: string;

  @IsOptional()
  @IsString()
  badgeSubTitle?: string;

  @IsOptional()
  @IsString()
  badgeColour?: string;

  @IsOptional()
  @IsString()
  qualityLeads?: string;

  @IsOptional()
  @IsString()
  leadShowCase?: string;

  @IsOptional()
  @IsString()
  replacementPolicyText?: string;

  @IsOptional()
  @IsString()
  replacementPolicyHeader?: string;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @IsOptional()
  deletedAt?: Date;
}
