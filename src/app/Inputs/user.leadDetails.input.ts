import { IsArray  , IsNotEmpty, } from "class-validator";

export class UserLeadDetailsInput {
  // @IsInt({ message: "daily is required." })
  @IsNotEmpty()

  daily: number;

//   @IsInt({ message: "weekly should be valid." })

//   weekly: number;
@IsNotEmpty()

  @IsArray({ message: "leadSchedule is required." })

  leadSchedule: [];

  @IsNotEmpty()

  @IsArray({ message: "postCodeTargettingList is required." })

  postCodeTargettingList: [];


}
