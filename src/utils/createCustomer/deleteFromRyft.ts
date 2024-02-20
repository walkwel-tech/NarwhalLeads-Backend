import axios from "axios";
// import { CreateCustomerInput } from "../../app/Inputs/createCustomerOnRyft&Lead.inputs";
import logger from "../winstonLogger/logger";
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
        logger.info("customer deleted on RYFT", new Date(), "Today's Date");
        resolve(response);
      })
      .catch((err) => {
        logger.error("ryft error", err.response?.data, new Date(), "Today's Date");

        reject(err.response?.data);
      });
  });
};
