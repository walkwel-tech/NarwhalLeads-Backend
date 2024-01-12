import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateAdBodyValidator {
    @IsOptional()
    @IsArray({ message: 'At least one industry is required' })
    @ArrayMinSize(1, { message: 'At least one industry is required' })
    industries: string[]; // Assuming industries are represented as array of string ObjectId

    @IsOptional()
    @IsString({ message: 'Title must be a string' })
    title: string;

    @IsOptional()
    @IsString({ message: 'Call to action must be a string' })
    callToAction: string;

    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description: string;

    @IsOptional()
    @IsString({ message: 'Button text must be a string' })
    buttonText: string;

    @IsOptional()
    @IsDateString({}, { message: 'Invalid start date' })
    startDate: string;

    @IsOptional()
    @IsDateString({}, { message: 'Invalid end date' })
    endDate: string;

    @IsOptional()
    @IsBoolean()
    isActive?: string;
    
    @IsOptional()
    @IsBoolean()
    isTargetReachedEnable?: string;

    @IsNumber({}, { message: 'Invalid number' })
    @IsOptional()
    // @IsNotEmpty({ message: 'Target reach is required' })
    targetReach: number;
}