import { IsNotEmpty, IsString } from "class-validator";

export class CheckBadgeBodyValidator {
    @IsNotEmpty()
    @IsString({ message: "website should be valid." })
    website: string;
}