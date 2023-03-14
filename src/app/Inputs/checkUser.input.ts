import { IsString } from "class-validator";

export class CheckUserInput {
  @IsString({ message: "phone number is required." })
  salesPhoneNumber: string;

  @IsString({ message: "email is required." })
  email: string;


}
