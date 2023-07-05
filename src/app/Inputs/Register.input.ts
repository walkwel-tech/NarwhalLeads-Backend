import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class RegisterInput {
  @IsNotEmpty()
  @IsString({ message: "Firstname is required." })
  firstName: string;

  @IsNotEmpty()
  @IsString({ message: "Lastname is required." })
  lastName: string;

  @IsNotEmpty()
  @IsEmail({}, { message: "Email should be valid." })
  email: string;

  // @IsString( { message: "phoneNumber should be valid." })
  // phoneNumber: string;
  @IsNotEmpty()
  @IsString({ message: "password is required." })
  password: string;


}
