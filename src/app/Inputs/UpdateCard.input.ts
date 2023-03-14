import { IsOptional } from "class-validator";

export class UpdateCardInput {
  @IsOptional()
  cardNumber?: string;

  @IsOptional()
  expiryMonth: string;

  @IsOptional()
  expiryYear: string;

  @IsOptional()
  cvc: string;

  @IsOptional()
  amount: Number;
  
  @IsOptional()
  isDefault: Boolean;


}
