import axios from "axios";
import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
import { User } from "../../app/Models/User";
const POST = "post";
export const createCustomerOnLeadByte = (params: CreateCustomerInput) => {
  return new Promise((resolve, reject) => {
    const configLead = {
      method: POST,
      url: process.env.CREATE_CUSTOMER_ON_LEAD_BYTE_URL,
      headers: {
        X_KEY: process.env.LEAD_BYTE_API_KEY,
      },
      data: {
        company: params.company,
        street1: params.street1,
        street2: params.street2,
        towncity: params.towncity,
        // county:Name of county,
        postcode: params.postcode,
        country_name: params.country_name,
        phone: params.phone,
        
      },
    };
    axios(configLead)
      .then(async (response) => {
        if (response.data.bid) {
          await User.findByIdAndUpdate(params.userId, {
            isLeadbyteCustomer: true,
            buyerId: response.data.bid,
          });
        }
        resolve(response);
      })
      .catch((err) => {

        reject(err);
      });
  });
};
