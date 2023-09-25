import axios from "axios";
// import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
import { User } from "../../app/Models/User";
const POST = "post";

export const createCustomerOnRyft = (params: Record<string,any>) => {
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
       await User.findByIdAndUpdate(params.userId, { isRyftCustomer: true,ryftClientId:response.data.id });
        resolve(response);
      })
      .catch((err) => {
        console.log('ryft error',err.response?.data);
        
        reject(err.response?.data);
      });
  });
};
