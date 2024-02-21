import axios from "axios";
import { EVENT_TITLE, EVENT_TYPE } from "../constantFiles/events";
import { saveEventLogs } from "../Functions/saveLogs";
import { UserInterface } from "../../types/UserInterface";
import logger from "../winstonLogger/logger";
const POST = "post";
export const sendLeadDataToZap = (
  url: string,
  data: any,
  user: UserInterface
) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: url,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };
    axios(config)
      .then(async (response) => {
        logger.info(
          "lead zap webhook hits successfully",
          user._id
        );
        let params = {
          userId: user?._id,
          eventType: EVENT_TYPE.WEBHOOK,
          eventTitle: EVENT_TITLE.LEAD_DATA,
          statusCode: response.status,
          data: data,
        };
        saveEventLogs(params);
        resolve(response);
      })
      .catch((err) => {
        logger.error("Error", err);
        let params = {
          userId: user?._id,
          eventType: EVENT_TYPE.WEBHOOK,
          eventTitle: EVENT_TITLE.LEAD_DATA,
          statusCode: err.status,
          data: data,
          notes: err,
        };
        saveEventLogs(params);
        reject(err);
      });
  });
};
