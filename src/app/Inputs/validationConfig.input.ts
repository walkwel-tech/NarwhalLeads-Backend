import { IsBoolean, IsNotEmpty } from "class-validator";

export class ValidationConfigInput {
   
  @IsNotEmpty()
  value: string | number;

  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}
