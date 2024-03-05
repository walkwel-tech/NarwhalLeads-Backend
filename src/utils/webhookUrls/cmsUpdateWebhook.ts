import axios from "axios";
import logger from "../winstonLogger/logger";

interface ICmsUpdateBody {
  [key: string]: string;
}
type HttpMethod = "POST" | "PUT" | "PATCH" | "GET";

export const cmsUpdateWebhook = async (
  end_point: string,
  Method: HttpMethod,
  body: ICmsUpdateBody
) => {
  try {
    let config = {
      method: Method,
      url: `${process.env.CMS_UPDATE_BUYER_WEBHOOK_URL}${end_point}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CMS_UPDATE_BUYER_WEBHOOK_KEY}`,
      },
      data: body,
    };

    const res = await axios(config);
    logger.info("CMS updated successfully", res.data)
    return res.data;
  } catch (err) {
    logger.error("Error in updating cms ", err.response);
    return err.response;
  }
};
