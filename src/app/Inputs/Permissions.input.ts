import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class PermissionInput {
    @IsString({ message: "role is required" })
    role: string;

    @IsNotEmpty()
    @IsArray({message: "permissions is required"})
    permissions: [];

}