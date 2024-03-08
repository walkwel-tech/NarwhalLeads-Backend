import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";
import { PAYMENT_STATUS } from "../../../../utils/Enums/payment.status";
import { transactionTitle } from "../../../../utils/Enums/transaction.title.enum";

export class GetTransactionQuery {
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  @IsIn([...Object.keys(PAYMENT_STATUS), ""])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn([...Object.keys(transactionTitle), ""])
  type?: string;

  @IsOptional()
  @IsNumber()
  perPage?: number;

  @IsOptional()
  @IsNumber()
  page?: number;
}
