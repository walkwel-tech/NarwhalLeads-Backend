import { IsOptional } from "class-validator";

export class UpdateUserInput {
  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName: string;

  @IsOptional()
  email: string;

  @IsOptional()
  salesPhoneNumber: string;

  @IsOptional()
  image: string;

  @IsOptional()
  password: string;

  @IsOptional()
  address: string;

  @IsOptional()
  city: string;

  @IsOptional()
  country: string;

  @IsOptional()
  postCode: string;

  @IsOptional()
  companyName: string;

  @IsOptional()
  companyUSPs:string;

  @IsOptional()
  buyer_id:string;

  @IsOptional()
  leadCost:Number

  @IsOptional()
  autoCharge: Boolean;

  @IsOptional()
  credits: string;

}
