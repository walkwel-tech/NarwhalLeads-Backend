import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
import { EVENT_TITLE, EVENT_TYPE } from "../constantFiles/events";
import { saveEventLogs } from "../Functions/saveLogs";
import { Types } from "mongoose";
import { County } from "../Functions/flattenPostcodes";
import { PostCode } from "../../types/LeadDetailsInterface";

const POST = "post";

export interface PostcodeWebhookParams {
  userId: Types.ObjectId;
  buyerId?: string;
  bid?: string;
  businessName: string | undefined;
  businessIndustry?: string;
  eventCode: string;
  topUpAmount?: string | number;
  type?: string;
  postCodeList?: County[] | PostCode[];
  miles?: string;
  postcode?: PostCode[];
  remainingCredits?: string | number;
  businessSalesNumber?: string;
  leadSchedule?: string[];
  dailyLeadCap?: string | number;
  dailyCap?: string | number;
  weeklyCap?: string | number;
  computedCap?: string | number;
}

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
      else if (data.eventCode === EVENT_TITLE.RADIUS_UPDATE) {
        config.url = `${process.env.RADIUS_UPDATE_URL_WEBHOOK}`;
      } else if (data.eventCode === EVENT_TITLE.BUSINESS_PHONE_NUMBER) {
        config.url = `${process.env.BUSINESS_SALES_NUMBER_UPDATE_WEHOOK_URL}`;
      } else if (data.eventCode === EVENT_TITLE.DAILY_LEAD_CAP) {
        config.url = `${process.env.DAILY_LEAD_CAP_WEBHOOK_URL}`;
      } else if (data.eventCode === EVENT_TITLE.LEAD_SCHEDULE_UPDATE) {
        config.url = `${process.env.LEAD_SCHEDULE_UPDATE_WEBHOOK_URL}`;
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
      console.log("Access denied!!", new Date(), "Today's Date");
      resolve("Access denied!!");
    }
  });
};
