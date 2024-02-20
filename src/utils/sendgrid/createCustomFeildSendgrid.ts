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
      `Custom field '${fieldName}' created with status code: ${response.status}`, new Date(), "Today's Date"
    );

    return { statusCode: response.status, body: response.data };
  } catch (error) {
    logger.error('Error:', error, new Date(), "Today's Date");
    return { error: error };
  }
};

(async () => {
  try {
    await createCustomField("signUpStatus", "Text");

    await createCustomField("businessIndustry", "Text");

    logger.info("Custom fields created successfully!", new Date(), "Today's Date");
  } catch (error) {
    logger.error("Error creating custom fields:", error, new Date(),"Today's Date");
  }
})();
