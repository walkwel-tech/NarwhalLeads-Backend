import axios from "axios";
import logger from "../../utils/winstonLogger/logger"

require("dotenv").config();

if (
  !process.env.SENDGRID_API_KEY ||
  !process.env.SENDGRID_CUSTOM_FEILD_REQUEST_URL
) {
  throw new Error("SendGrid credentials not found");
}

const sendgridRequestUrl: string =
  process.env.SENDGRID_CUSTOM_FEILD_REQUEST_URL;
const sendGridApiKey: string = process.env.SENDGRID_API_KEY;
export const createCustomField = async (
  fieldName: string,
  fieldType: string
) => {
  try {
    const data = {
      name: fieldName,
      field_type: fieldType,
    };

    const config = {
      headers: {
        Authorization: `Bearer ${sendGridApiKey}`,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.post(sendgridRequestUrl, data, config);
    logger.info(
      `Custom field '${fieldName}' created with status code: ${response.status}`, { response }
    );

    return { statusCode: response.status, body: response.data };
  } catch (error) {
    logger.error('Error:', error);
    return { error: error };
  }
};

(async () => {
  try {
    await createCustomField("signUpStatus", "Text");

    await createCustomField("businessIndustry", "Text");

    logger.info("Custom fields created successfully!");
  } catch (error) {
    logger.error("Error creating custom fields:", error);
  }
})();
