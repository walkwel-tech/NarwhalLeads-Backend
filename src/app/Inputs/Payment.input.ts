import { IsString } from "class-validator";

export class PaymentInput {
  @IsString({ message: "fixedAmount is required." })
  fixedAmount:  number
  
  @IsString({ message: "email is required." })

  email:string
  @IsString({ message: "cardNumber is required." })

  cardNumber:string
  @IsString({ message: "expiryMonth is required." })

  expiryMonth:string
  @IsString({ message: "expiryYear is required." })

  expiryYear:string
  @IsString({ message: "cvc is required." })

  cvc:string
  @IsString({ message: "buyerId is required." })

  buyerId:string
  @IsString({ message: "freeCredits is required." })
  // @ts-ignore
  freeCredits:  number

}
