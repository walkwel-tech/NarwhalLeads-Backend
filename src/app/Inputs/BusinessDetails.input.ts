import {  IsArray, IsNotEmpty, IsString } from "class-validator";

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

   
  @IsNotEmpty()
  @IsString({ message: "address1 is required." })

  address1: string;

   
  @IsNotEmpty()
  @IsString({ message: "business Sales-Number is required." })

  businessSalesNumber: string;

  @IsNotEmpty()
  @IsString({ message: "businessMobilePrefixCode is required." })

  businessMobilePrefixCode: string;

   
  // @IsNotEmpty()
  @IsArray({ message: "business Opening Hours is required." })

  businessOpeningHours: [];

   
  @IsNotEmpty()
  @IsString({ message: "business City is required." })

  businessCity: string;

   
  @IsNotEmpty()
  @IsString({ message: "business PostCode is required." })

  businessPostCode: string;

  
  @IsArray({ message: "Buyer Questions must be an array." })
  buyerQuestions: BuyerQuestionInput[];

  

  // @IsNotEmpty()
  // @IsString({ message: "businessCountry is required." })

  // businessCountry: string;

   

}

export class BuyerQuestionInput {
  @IsString()
  title: string;

  @IsString({ message: "Question Slug should be valid." })
  questionSlug: string;

  @IsString({ message: "Answer should be a valid string." })
  answer: string;
}
