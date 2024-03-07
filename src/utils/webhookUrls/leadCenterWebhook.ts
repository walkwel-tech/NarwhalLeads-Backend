import axios from "axios";
import logger from "../winstonLogger/logger";
import { DELETE, GET, PATCH, POST, PUT } from "../constantFiles/HttpMethods";
import { LeadCenterCredential } from "../../app/Models/LeadCenterCredential";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import { getLeadCenterToken } from "../Functions/getLeadCenterToken";
import { saveEventLogs } from "../Functions/saveLogs";
import { EVENT_TYPE } from "../constantFiles/events";
import { Types } from "mongoose";
interface ICmsUpdateBody {
  [key: string]: any;
}

type HttpMethod =
  | typeof POST
  | typeof PUT
  | typeof PATCH
  | typeof GET
  | typeof DELETE;

interface ILoginResponse {
  key: string;
}

interface ILoggingData {
  eventTitle: string;
  id: Types.ObjectId;
}

export const leadCenterWebhook = async (
  end_point: string,
  Method: HttpMethod,
  body: ICmsUpdateBody,
  loggingData: ILoggingData
) => {
    // checkAccess()
  if (checkAccess()) {
    const credential = await LeadCenterCredential.findOne();
    let config = {
      method: Method,
      url: `${process.env.LEAD_REPORT_ACCEPTED_WEBHOOK_URL}${end_point}`,
      headers: {
        "Content-Type": "application/json",
        authorization: `TOKEN ${credential?.token}`,
      },
      data: body,
    };
    try {
      const res = await axios(config);
      const params = {
        userId: loggingData.id,
        eventType: EVENT_TYPE.WEBHOOK,
        eventTitle: loggingData.eventTitle,
        statusCode: res.status,
        data: res.data,
      };
      saveEventLogs(params);

      logger.info("CMS updated successfully", res.data);
      return res.data;
    } catch (err) {
      let params = {
        userId: loggingData.id,
        eventType: EVENT_TYPE.WEBHOOK,
        eventTitle: loggingData.eventTitle,
        statusCode: err.response.status,
        data: body,
        notes: err?.response?.data,
      };
      saveEventLogs(params);
      if (err?.response?.status === 401) {
        try {
          // using previously made function
          const loginRes = await getLeadCenterToken();
          config.headers.authorization = `TOKEN ${
            (loginRes as ILoginResponse)?.key
          }`;
          const res = await axios(config);
          logger.info("CMS updated successfully retrying", res.data);
          return res.data;
        } catch (err) {
          logger.error("Error in updating cms retrying case", err.response);
          return err.response;
        }
      }
      logger.error("Error in updating cms ", err.response);

      return err.response;
    }
  }
};
