import { Request, Response } from "express";
import { UpdateEmailBodyValidator } from "../../../Inputs/updateEmail.input";
import { validate } from "class-validator";
import { User } from "../../../Models/User";
import stripe from "../../../../utils/payment/stripe/stripeInstance";

export const updateEmailAction = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id;
    const { email } = req.body;
    const reqBody = new UpdateEmailBodyValidator();
    reqBody.email = email;
    const validationErrors = await validate(reqBody);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid request body", validationErrors },
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(400).json({
        error: { message: "user does not exist" },
      });
    }

    const emailExist = await User.findOne({
      email: email,
    });

    if (emailExist) {
      return res.status(400).json({
        error: { message: "email  already exist" },
      });
    }

    let upCustomer;
    // update email id also at stripe
    if (user.stripeClientId) {
      await stripe.customers.update(user.stripeClientId, {
        email,
      });
      upCustomer = await stripe.customers.retrieve(user.stripeClientId);
    }

    const updatedUser = await User.findByIdAndUpdate(id, { email: email }, { new: true });

    res.json({
      data: { user: updatedUser, stripeCustomer: upCustomer },
      message: "User email updated successfully",
    });
  } catch (err) {
    return res.status(500).json({ error: { message: "Something went wrong.", err } });
  }
};
