import axios from "axios";
import {checkAccess} from "../../app/Middlewares/serverAccess";
import {EVENT_TITLE, EVENT_TYPE} from "../constantFiles/events";
import {saveEventLogs} from "../Functions/saveLogs";
import logger from "../winstonLogger/logger";

const POST = "post";

export const eventsWebhook = (data: any) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      headers: {
        "Content-Type": "application/json",
      },
      url: `${process.env.INITIAL_WEBHOOK_URL}`,
      data: { data },
    };

    if (checkAccess()) {

      switch (data.eventCode) {
        case EVENT_TITLE.ZERO_CREDITS:
          config.url = `${process.env.ZERO_CREDITS_URL_WEBHOOK}`;
          break;

        case EVENT_TITLE.ADD_CREDITS:
          config.url = `${process.env.TOP_UP_URL_WEBHOOK}`;
          break;

        case EVENT_TITLE.POST_CODE_UPDATE:
          config.url = `${process.env.POST_CODE_UPDATE_URL_WEBHOOK}`;
          break;

        case EVENT_TITLE.RADIUS_UPDATE:
          config.url = `${process.env.RADIUS_UPDATE_URL_WEBHOOK}`;
          break;

        case EVENT_TITLE.BUSINESS_PHONE_NUMBER:
          config.url = `${process.env.BUSINESS_SALES_NUMBER_UPDATE_WEHOOK_URL}`;
          break;

        case EVENT_TITLE.DAILY_LEAD_CAP:
          config.url = `${process.env.DAILY_LEAD_CAP_WEBHOOK_URL}`;
          break;

        case EVENT_TITLE.LEAD_SCHEDULE_UPDATE:
          config.url = `${process.env.LEAD_SCHEDULE_UPDATE_WEBHOOK_URL}`;
          break;

        case EVENT_TITLE.USER_AUTO_CHARGE_UPDATE:
          config.url = `${process.env.USER_AUTO_CHARGE_UPDATE_WEBHOOK_URL}`;
          break;


        default:
          // Handle the case where none of the conditions are met
          break;

      }

      if (!config.url) {
        logger.info("No webhook URL found!!");
        resolve("No webhook URL found!!");

        return;
      }

      axios(config)
        .then((response) => {
          let params = {
            userId: data.userId,
            eventType: EVENT_TYPE.WEBHOOK,
            eventTitle: data.eventCode,
            statusCode: response.status,
            data: data,
          };
          saveEventLogs(params);
          resolve(response.data);
        })
        .catch((err) => {
          let params = {
            userId: data.userId,
            eventType: EVENT_TYPE.WEBHOOK,
            eventTitle: data.eventCode,
            statusCode: err.status,
            data: data,
            notes: err,
          };
          saveEventLogs(params);
          reject(err);
        });
    } else {
      logger.info("Access denied!!");
      resolve("Access denied!!");
    }
  });
};
