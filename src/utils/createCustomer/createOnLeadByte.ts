import axios from "axios";
import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
import { User } from "../../app/Models/User";
import { checkAccess } from "../../app/Middlewares/serverAccess";
let FormData = require("form-data");

const POST = "post";
export const createCustomerOnLeadByte = (params: CreateCustomerInput) => {

  return new Promise((resolve, reject) => {
    let data = new FormData();
    data.append("street1", params.street1);
    data.append("street2", params?.street2);
    data.append("towncity", params.towncity);
    // data.append('county', params?.county);
    data.append("postcode", params.postcode);
    data.append('country_name', 'United Kingdom');
    data.append("phone",params.phone);
    data.append("company", params?.company);
    data.append("external_ref", params?.company);
    const configLead = {
      method: POST,
      url: process.env.CREATE_CUSTOMER_ON_LEAD_BYTE_URL,
      headers: {
        X_KEY: process.env.LEAD_BYTE_API_KEY,
      },
      data: data
    };
    if(checkAccess()){
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
        
        reject(err.response?.data);
      });
    }
  
  });
};
