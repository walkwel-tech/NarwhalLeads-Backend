import { IsString } from 'class-validator';

export class ChangePasswordInput {
    @IsString({ message: 'Current Password should not be empty.' })
    currentPassword: string;

    @IsString({ message: 'New Password should not be empty' })
    newPassword: string;

    @IsString({ message: 'confirm Password should not be empty' })
    confirmPassword: string;
}
