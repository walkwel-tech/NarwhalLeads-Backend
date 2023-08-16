import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
import { createCustomerOnLeadByte } from "./createOnLeadByte";
// import { createCustomerOnRyft } from "./createOnRyft";
export const createCustomersOnRyftAndLeadByte = (params: CreateCustomerInput) => {
  const allPromises = [
    // createCustomerOnRyft(params),
    createCustomerOnLeadByte(params),

  ];
 return Promise.all(allPromises)
    .then((res) => {
    })
    .catch(async (err) => {
      console.log("ERRRORRRR",err.response?.data);

    });
};
