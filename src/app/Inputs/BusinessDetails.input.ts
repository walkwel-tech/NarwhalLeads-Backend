import { IsString } from "class-validator";

export class BusinessDetailsInput {
  @IsString({ message: "business Industry is required." })

  businessIndustry: string;

  @IsString({ message: "business Name should be valid." })

  businessName: string;

  @IsString({ message: "business Logo is required." })

  businessLogo: string;

  @IsString({ message: "business Sales-Number is required." })

  businessSalesNumber: string;
  @IsString({ message: "business Address is required." })

  businessAddress: string;
  @IsString({ message: "business City is required." })

  businessCity: string;
  @IsString({ message: "business Country is required." })

  businessCountry: string;
  @IsString({ message: "business PostCode is required." })

  businessPostCode: string;
  @IsString({ message: "business Opening Hours is required." })

  businessOpeningHours: [];

}
