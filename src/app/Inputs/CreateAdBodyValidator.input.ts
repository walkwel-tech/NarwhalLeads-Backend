import { ArrayMinSize, IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAdBodyValidator {
    @IsArray({ message: 'At least one industry is required' })
    @ArrayMinSize(1, { message: 'At least one industry is required' })
    industries: string[]; // Assuming industries are represented as array of string ObjectId

    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    title: string;

    @IsString({ message: 'Call to action must be a string' })
    @IsNotEmpty({ message: 'Call to action is required' })
    callToAction: string;

    @IsString({ message: 'Description must be a string' })
    @IsNotEmpty({ message: 'Description is required' })
    description: string;

    @IsString({ message: 'Button text must be a string' })
    @IsNotEmpty({ message: 'Button text is required' })
    buttonText: string;

    @IsDateString({}, { message: 'Invalid start date' })
    @IsNotEmpty({ message: 'Start date is required' })
    startDate: string;

    @IsDateString({}, { message: 'Invalid end date' })
    @IsNotEmpty({ message: 'End date is required' })
    endDate: string;

    @IsNumber({}, { message: 'Invalid number' })
    @IsOptional()
    // @IsNotEmpty({ message: 'Target reach is required' })
    targetReach: number;

}
