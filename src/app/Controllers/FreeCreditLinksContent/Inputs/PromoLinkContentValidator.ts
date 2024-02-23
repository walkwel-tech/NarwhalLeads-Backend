import { IsOptional, IsString, IsBoolean } from "class-validator";

export class FreeCreditLinkContentValidator {
  @IsOptional()
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
  badgeColor?: string;

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
