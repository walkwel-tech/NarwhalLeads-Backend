import { IsString } from 'class-validator';

export class CreateRoleInput {
    @IsString({ message: 'Role should not be empty.' })
    role: string;
}
