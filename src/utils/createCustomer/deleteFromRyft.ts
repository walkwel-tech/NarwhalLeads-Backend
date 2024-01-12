import axios from "axios";
// import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
const DELETE = "delete";

export const deleteCustomerOnRyft = (id: string) => {
  return new Promise((resolve, reject) => {
    const config = {
      method: DELETE,
      url: `${process.env.RYFT_DELETE_CUSTOMER_URL}/${id}`,
      headers: {
        Authorization: process.env.RYFT_SECRET_KEY,
      },
    };
    axios(config)
      .then(async (response) => {
        console.log("customer deleted on RYFT");
        resolve(response);
      })
      .catch((err) => {
        console.log("ryft error", err.response?.data);

        reject(err.response?.data);
      });
  });
};
