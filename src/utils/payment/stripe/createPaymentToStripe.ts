import { CardDetails } from "../../../app/Models/CardDetails";
import { Transaction } from "../../../app/Models/Transaction";
import { User } from "../../../app/Models/User";
import { CARD } from "../../Enums/cardType.enum";
import { TRANSACTION_STATUS } from "../../Enums/transaction.status.enum";
import { transactionTitle } from "../../Enums/transaction.title.enum";
import { SRIPE_CONSTANT } from "../../constantFiles/stripeConstants";
import { IntentInterface } from "./paymentIntent";
import axios from "axios";
const qs = require("qs");
const POST = "post";
export const createPaymentOnStripe = async (
  params: IntentInterface,
  isAutoCharge: boolean
) => {
  return new Promise((resolve, reject) => {
    let data;
    if (isAutoCharge) {
      data = qs.stringify({
        amount: Math.ceil(params.amount || 0),
        currency: params.currency,
        customer: params.customer,
        confirm: true,
        payment_method: params.paymentMethod,
        setup_future_usage: SRIPE_CONSTANT.OFF_SESSION,
        return_url: process.env.RETURN_URL,
      });
    } else {
      data = qs.stringify({
        amount: Math.ceil(params.amount || 0),
        currency: params.currency,
        automatic_payment_methods: { enabled: true },
        customer: params.customer,
        return_url: process.env.RETURN_URL,
        confirm: true,
        payment_method: params.paymentMethod,
      });
    }

    let config = {
      method: POST,
      maxBodyLength: Infinity,
      url: process.env.STRIPE_MAKE_PAYMENT_URL,
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    };
    axios
      .request(config)
      .then(async (response: any) => {
        const user = await User.findOne({
          stripeClientId: response?.data?.customer,
        });
        const card = await CardDetails.findOne({
          paymentMethod: response?.data?.payment_method,
          isDeleted: false,
        });
        await Transaction.create({
          userId: user?.id,
          cardId: card?.id,
          amount: response.data.amount / 100,
          paymentSessionId: response.data.id,
          status: TRANSACTION_STATUS.SUCCESS,
          paymentMethod: response.data?.payment_method,
          title: transactionTitle.SESSION_CREATED,
          transactionType: CARD.STRIPE,
        });
        resolve(response.data);
      })
      .catch(async (error: any) => {
        const user = await User.findOne({
          stripeClientId: params.customer,
        });
        const card = await CardDetails.findOne({
          paymentMethod: params.paymentMethod,
          isDeleted: false,
        });
        await Transaction.create({
          userId: user?.id,
          cardId: card?.id,
          amount: params.amount,
          paymentSessionId: "",
          status: TRANSACTION_STATUS.FAIL,
          paymentMethod: params.paymentMethod,
          title: transactionTitle.SESSION_CREATED,
          transactionType: CARD.STRIPE,
        });

        reject(error);
      });
  });
};
