import axios from "axios";
import { User } from "../../app/Models/User";
import { Types } from "mongoose";
import { LOGS_STATUS } from "../Enums/logs.status.enum";
import { PORTAL } from "../Enums/portal.enum";
import { saveLogs } from "../Functions/saveLogs";
import { REGISTRATION_IDS } from "../constantFiles/errorConstants";
const POST = "post";
const qs = require("qs");

export const createCustomerOnStripe = (params: {
  email: string;
  firstName: string;
  lastName: string;
  userId: Types.ObjectId;
}) => {
  return new Promise((resolve, reject) => {
    const config = {
      method: POST,
      url: process.env.STRIPE_CUSTOMER_CREATE_URL,
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },

      data: qs.stringify({
        name: `${params.firstName} ${params.lastName}`,
        email: params?.email,
      }),
    };
    axios(config)
      .then(async (response) => {
        if (response.data.id) {
          await User.findByIdAndUpdate(params.userId, {
            isStripeCustomer: true,
            stripeClientId: response.data.id,
          });
        }
        const logsData = {
          userId: params.userId,
          registrationId: response.data.id,
          status: LOGS_STATUS.SUCCESS,
          portal: PORTAL.STRIPE,
        };
        await saveLogs(logsData);
        resolve(response);
      })
      .catch(async (err) => {
        const logsData = {
          userId: params.userId,
          registrationId: REGISTRATION_IDS.NO_REGISTRATION_IDS,
          status: LOGS_STATUS.FAIL,
          portal: PORTAL.STRIPE,
          notes: err?.data?.message,
        };
        await saveLogs(logsData);
        reject(err.response?.data);
      });
  });
};
