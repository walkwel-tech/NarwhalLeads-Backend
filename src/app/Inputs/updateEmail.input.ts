import { IsEmail, IsNotEmpty } from "class-validator";

export class UpdateEmailBodyValidator {
  @IsNotEmpty()
  @IsEmail({}, { message: "Invalid email format" })
  email: string;
}
