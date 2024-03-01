import { validate } from "class-validator";
import { BuyerQuestionInput } from "../../../Inputs/BuyerDetails.input";
import { BuyerDetails } from "../../../Models/BuyerDetails";

export const createBuyerQuestions = async (buyerQuestions: BuyerQuestionInput[], clientId: any): Promise<any> => {
  if (!buyerQuestions || !Array.isArray(buyerQuestions) || buyerQuestions.length === 0) {
    return { error: "Buyer questions array is required and should not be empty" };
  }

  const buyerQuestionsInput: any = buyerQuestions.map((item: any) => ({
    questionSlug: item.questionSlug,
    answer: item.answer,
  }));

  const buyerDetailsInput = new BuyerDetails();
  buyerDetailsInput.buyerQuestions = buyerQuestionsInput;
  buyerDetailsInput.clientId  = clientId;

  const errors = await validate(buyerDetailsInput);
  if (errors.length > 0) {
    return { errors: errors.toString() };
  }

  const createdBuyerDetails = await BuyerDetails.create(buyerDetailsInput);

  return { message: "Buyer details created successfully", data: createdBuyerDetails };
};
