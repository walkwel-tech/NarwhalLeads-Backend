import axios from "axios";
import { LeadCenterCredential } from "../../app/Models/LeadCenterCredential";
import { LeadCenterCredentialInterface } from "../../types/LeadCenterCredentialsInterface";

export const getLeadCenterToken = () => {
  let loginConfig = {
    method: "post",
    url: `${process.env.LEAD_REPORT_ACCEPTED_WEBHOOK_URL}auth/login/`,
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      email: `${process.env.LEAD_CENTER_ADMIN_EMAIL}`,
      password: `${process.env.LEAD_CENTER_ADMIN_PASS}`,
    },
  };
  return new Promise(async (resolve, reject) => {
    axios(loginConfig)
      .then(async (response) => {
        const credential =
          (await LeadCenterCredential.findOne()) as LeadCenterCredentialInterface;
        if (credential) {
          await LeadCenterCredential.findOneAndUpdate(
            { _id: credential?._id },
            { token: response.data.key }
          );
        } else {
          await LeadCenterCredential.create({ token: response.data.key });
        }
        resolve(response.data);
      })
      .catch((err) => {
        reject(err.response);
        console.error(err);
      });
  });
};
