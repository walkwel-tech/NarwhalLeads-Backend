import { IsArray, IsBoolean, IsMongoId, IsOptional, IsString } from "class-validator";
import { TimePeriod } from "./TimePeriod.input";

export class QueryParams {
    @IsOptional()
    liveBtw?: TimePeriod;

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    industry?: string[];

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsBoolean()
    active?: string;

    @IsOptional()
    // @IsNumber()
    page?: number;

    @IsOptional()
    // @IsNumber()
    perPage?: number;

}