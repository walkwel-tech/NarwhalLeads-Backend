import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import { EVENT_TITLE, EVENT_TYPE } from "../constantFiles/events";
import { saveEventLogs } from "../Functions/saveLogs";

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
      if (data.eventCode === EVENT_TITLE.ZERO_CREDITS) {
        config.url = `${process.env.ZERO_CREDITS_URL_WEBHOOK}`;
      } else if (data.eventCode === EVENT_TITLE.ADD_CREDITS) {
        config.url = `${process.env.TOP_UP_URL_WEBHOOK}`;
      } else if (data.eventCode === EVENT_TITLE.POST_CODE_UPDATE) {
        config.url = `${process.env.POST_CODE_UPDATE_URL_WEBHOOK}`;
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
      console.log("Access denied!!");
      resolve("Access denied!!");
    }
  });
};
