import { IsDateString } from "class-validator";

export class TimePeriod {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
