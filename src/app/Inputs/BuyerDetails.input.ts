import { IsArray, IsString } from "class-validator";

export class BuyerDetailsInput {

  @IsArray({ message: "Buyer Questions must be an array." })
  buyerQuestions: BuyerQuestionInput[];
}

export class BuyerQuestionInput {
  @IsString()
  title: string;

  @IsString({ message: "Question Slug should be valid." })
  questionSlug: string;

  @IsString({ message: "Answer should be a valid string." })
  answer: string;
}
