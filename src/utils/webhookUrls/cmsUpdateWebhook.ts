import axios from "axios";

import {GET, PATCH, POST, PUT} from "../constantFiles/HttpMethods";
import logger from "../winstonLogger/logger";

interface ICmsUpdateBody {
    [key: string]: any;
}


type HttpMethod = typeof POST | typeof PUT | typeof PATCH | typeof GET;

export const cmsUpdateWebhook = async (
    end_point: string,
    Method: HttpMethod,
    body: ICmsUpdateBody
) => {
    try {
        let hookURL = (process.env.CMS_WEBHOOK_DEBUG_URL)
            ? process.env.CMS_WEBHOOK_DEBUG_URL
            : `${process.env.CMS_WEBHOOK_BASE_URL}${end_point}`;
        let config = {
            method: Method,
            url: hookURL,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.CMS_UPDATE_BUYER_WEBHOOK_KEY}`,
                "X-Intended-Route": end_point
            },
            data: body
        };

        const res = await axios(config);
        logger.info("CMS updated successfully", res.data);
        return res.data;
    } catch (err) {
        logger.error("Error in updating cms ", err.response);
        return err.response;
    }
};
