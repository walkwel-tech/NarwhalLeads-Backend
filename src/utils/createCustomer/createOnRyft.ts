import axios from "axios";
// import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
import { User } from "../../app/Models/User";
import { LOGS_STATUS } from "../Enums/logs.status.enum";
import { PORTAL } from "../Enums/portal.enum";
import { saveLogs } from "../Functions/saveLogs";
import { REGISTRATION_IDS } from "../constantFiles/errorConstants";
const POST = "post";

export const createCustomerOnRyft = (params: Record<string, any>) => {
  return new Promise((resolve, reject) => {
    const config = {
      method: POST,
      url: process.env.CREATE_CUSTOMER_ON_RYFT_URL,
      headers: {
        Authorization: process.env.RYFT_SECRET_KEY,
      },
      data: {
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
      },
    };
    axios(config)
      .then(async (response) => {
        await User.findByIdAndUpdate(params.userId, {
          isRyftCustomer: true,
          ryftClientId: response.data.id,
        });
        const logsData = {
          userId: params.userId,
          registrationId: response.data.id,
          status: LOGS_STATUS.SUCCESS,
          portal: PORTAL.RYFT,
        };
        await saveLogs(logsData);
        resolve(response);
      })
      .catch(async (err) => {
        console.log("ryft error", err.response?.data);
        const logsData = {
          userId: params.userId,
          registrationId: REGISTRATION_IDS.NO_REGISTRATION_IDS,
          status: LOGS_STATUS.FAIL,
          portal: PORTAL.RYFT,
          notes: err?.response?.data,
        };
        await saveLogs(logsData);
        reject(err.response?.data);
      });
  });
};
