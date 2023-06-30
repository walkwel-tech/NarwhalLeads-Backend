import { IsEmail, IsString } from "class-validator";

export class RegisterInput {
  @IsString({ message: "Firstname is required." })
  firstName: string;

  @IsString({ message: "Lastname is required." })
  lastName: string;

  @IsEmail({}, { message: "Email should be valid." })
  email: string;

  // @IsString( { message: "phoneNumber should be valid." })
  // phoneNumber: string;

  @IsString({ message: "password is required." })
  password: string;


}
