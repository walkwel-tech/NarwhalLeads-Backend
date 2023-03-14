import { IsString } from "class-validator";
import { Types } from "mongoose";

export class forgetPasswordInput{
  @IsString({ message: "user is required." })
  userId: Types.ObjectId;
  
  @IsString({ message: "email is required." })
  email:String;

  @IsString({ message: "text is required." })
  text:String;

}