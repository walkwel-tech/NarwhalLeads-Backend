import axios from "axios";
import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
import { User } from "../../app/Models/User";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import FormData from "form-data";
import { LOGS_STATUS } from "../Enums/logs.status.enum";
import { PORTAL } from "../Enums/portal.enum";
import { saveLogs } from "../Functions/saveLogs";
import { REGISTRATION_IDS } from "../constantFiles/errorConstants";
// let FormData = require("form-data");

const POST = "post";
export const createCustomerOnLeadByte = (params: CreateCustomerInput) => {
  return new Promise((resolve, reject) => {
    let data = new FormData();
    data.append("street1", params.street1);
    data.append("street2", params?.street2);
    data.append("towncity", params.towncity);
    // data.append('county', params?.county);
    data.append("postcode", params.postcode);
    data.append("country_name", "United Kingdom");
    data.append("phone", params.phone);
    data.append("company", params?.company);
    data.append("external_ref", params?.company);
    const configLead = {
      method: POST,
      url: process.env.CREATE_CUSTOMER_ON_LEAD_BYTE_URL,
      headers: {
        X_KEY: process.env.LEAD_BYTE_API_KEY,
      },
      data: data,
    };
    if (checkAccess()) {
      axios(configLead)
        .then(async (response) => {
          if (response.data.bid) {
            await User.findByIdAndUpdate(params.userId, {
              isLeadbyteCustomer: true,
              buyerId: response.data.bid,
            });
          }
          const logsData = {
            userId: params.userId,
            registrationId: response.data.bid,
            status: LOGS_STATUS.SUCCESS,
            portal: PORTAL.LEAD_BYTE,
          };
          await saveLogs(logsData);
          resolve(response);
        })
        .catch(async (err) => {
          console.log("lead byte error", err);
          const logsData = {
            userId: params.userId,
            registrationId: REGISTRATION_IDS.NO_REGISTRATION_IDS,
            status: LOGS_STATUS.FAIL,
            portal: PORTAL.LEAD_BYTE,
            notes: err,
          };
          await saveLogs(logsData);
          reject(err.response?.data);
        });
    }
  });
};
