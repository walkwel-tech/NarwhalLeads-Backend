import { IsMongoId, IsString, IsNotEmpty } from "class-validator";

export class UpdatePasswordInput {
  @IsNotEmpty()
  @IsString({ message: "Password is required." })
  password: string;

  @IsNotEmpty()
  @IsMongoId({ message: "Invalid mongo id." })
  id: string;
}
