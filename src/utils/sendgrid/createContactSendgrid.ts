import axios from "axios";
import logger from "../winstonLogger/logger";

if (
  !process.env.SENDGRID_API_KEY ||
  !process.env.SENDGRID_CONTACT_LIST_ID ||
  !process.env.SENDGRID_CONTACT_REQUEST_URL
) {
  throw new Error("SendGrid credentials not found");
}

const sendgridContactListId: string = process.env.SENDGRID_CONTACT_LIST_ID;
const sendgridRequestUrl: string = process.env.SENDGRID_CONTACT_REQUEST_URL;
const sendGridApiKey: string = process.env.SENDGRID_API_KEY;

interface CustomFields {
  signUpStatus: string;
  businessIndustry: string;
  [key: string]: string;
}

export const createContact = async (
  email: string,
  customFields: CustomFields
) => {
  try {
    const data = {
      list_ids: [sendgridContactListId],
      contacts: [
        {
          email: email,
          custom_fields: customFields,
        },
      ],
    };

    const config = {
      headers: {
        Authorization: `Bearer ${sendGridApiKey}`,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.put(sendgridRequestUrl, data, config);

    return { statusCode: response.status, body: response.data };
  } catch (error) {
    logger.error(
      "Error:",
      error
    );
    return { error: error };
  }
};
