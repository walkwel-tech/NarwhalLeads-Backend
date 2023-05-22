import { IsNotEmpty, IsString } from "class-validator";

export class BusinessDetailsInput {
   
  @IsNotEmpty()
  @IsString({ message: "business Industry is required." })

  businessIndustry: string;

  @IsNotEmpty()
  @IsString({ message: "business Name should be valid." })

  businessName: string;
 
  // @IsNotEmpty()
  // @IsString({ message: "business Logo is required." })

  // businessLogo: string;

   
  // @IsNotEmpty()
  // @IsString({ message: "address1 is required." })

  // address1: string;

   
  // @IsNotEmpty()
  // @IsString({ message: "address2 is required." })

  // address2: string;

   
  @IsNotEmpty()
  @IsString({ message: "business Sales-Number is required." })

  businessSalesNumber: string;

   
  @IsNotEmpty()
  @IsString({ message: "business Address is required." })

  businessAddress: string;

   
  // @IsNotEmpty()
  // @IsString({ message: "business City is required." })

  // businessCity: string;

   
  @IsNotEmpty()
  @IsString({ message: "business PostCode is required." })

  businessPostCode: string;

   
  // @IsNotEmpty()
  // @IsString({ message: "business Opening Hours is required." })

  // businessOpeningHours: [];

}
