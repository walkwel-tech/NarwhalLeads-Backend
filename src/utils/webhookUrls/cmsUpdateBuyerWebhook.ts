import axios from "axios";
import { User } from "../../app/Models/User";
import { CardDetails } from "../../app/Models/CardDetails";
import logger from "../winstonLogger/logger";

const POST = "post";
export const cmsUpdateBuyerWebhook = async (userId: String, cardId: String) => {
  const data = await userData(userId, cardId);

  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.CMS_UPDATE_BUYER_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CMS_UPDATE_BUYER_WEBHOOK_KEY}`,
      },
      data: data,
    };
    axios(config)
      .then(async (response) => {
        logger.info(
          "cms update buyer webhook hits successfully",
          response.data,
          new Date(),
          "Today's Date"
        );
      })
      .catch((err) => {
        logger.error(
          "cms update buyer webhook hits error",
          err.response?.data,
          new Date(),
          "Today's Date"
        );
      });
  });
};

const userData = async (userId: String, cardId: String) => {
  const user: any = await User.findById(userId)
    .populate("businessDetailsId")
    .populate("userLeadsDetailsId")
    .populate("userServiceId");
  const cards = await CardDetails.findById(cardId);
  let data: any = {
    buyerName: `${user?.firstName} ${user?.lastName}`,
    email: user?.email,
    buyerPhone: user?.phoneNumber,
    credits: user?.credits,
    autoChargeAmount: user?.autoChargeAmount,
    leadCost: user?.leadCost,
    isLeadCostCheck: user?.isLeadCostCheck,
    buyerId: user?.buyerId,
    xeroContactId: user?.xeroContactId,
    isXeroCustomer: user?.isXeroCustomer,
    isArchived: user?.isArchived,
    isUserSignup: user?.isUserSignup,
    userNotes: user?.userNotes,
    registrationMailSentToAdmin: user?.registrationMailSentToAdmin,
    ryftClientId: user?.ryftClientId,
    isRyftCustomer: user?.isRyftCustomer,
    isLeadbyteCustomer: user?.isLeadbyteCustomer,
    premiumUser: user?.premiumUser,
    isLeadReceived: user?.isLeadReceived,
    promoCodeUsed: user?.promoCodeUsed,
    triggerAmount: user?.triggerAmount,
    isSmsNotificationActive: user?.isSmsNotificationActive,
    smsPhoneNumber: user?.smsPhoneNumber,
    isSignUpCompleteWithCredit: user?.isSignUpCompleteWithCredit,
    daily: user?.userLeadsDetailsId?.daily,
    leadSchedule: JSON.stringify(user?.userLeadsDetailsId?.leadSchedule),
    postCodeTargettingList: JSON.stringify(
      user?.userLeadsDetailsId?.postCodeTargettingList
    ),
    leadAlertsFrequency: user?.userLeadsDetailsId?.leadAlertsFrequency,
    zapierUrl: user?.userLeadsDetailsId?.zapierUrl,
    sendDataToZapier: user?.userLeadsDetailsId?.sendDataToZapier,
    industry: user?.businessDetailsId?.businessIndustry,
    businessDescription: user?.businessDetailsId?.businessDescription,
    businessName: user?.businessDetailsId?.businessName,
    address1: user?.businessDetailsId?.address1,
    address2: user?.businessDetailsId?.address2,
    businessSalesNumber: user?.businessDetailsId?.businessSalesNumber,
    businessAddress: user?.businessDetailsId?.businessAddress,
    businessCity: user?.businessDetailsId?.businessCity,
    businessPostCode: user?.businessDetailsId?.businessPostCode,
    buyerColorLogo: user?.businessDetailsId?.businessLogo,
    // openingHoursWeekday: JSON.stringify(
    //   user?.businessDetailsId?.businessOpeningHours
    // ),
    financeAvailable: user?.userServiceId?.financeOffers,
    pricing: user?.userServiceId?.prices,
    accreditations: user?.userServiceId?.accreditations,
    installsIn: user?.userServiceId?.avgInstallTime,
    rating: user?.userServiceId?.trustpilotReviews,
    criteria: JSON.stringify(user?.userServiceId?.criteria),
    cardHolderName: cards?.cardHolderName,
    cardNumber: cards?.cardNumber,
    amount: cards?.amount,
    isDefault: cards?.isDefault,
    paymentMethod: cards?.paymentMethod,
    paymentSessionID: cards?.paymentSessionID,
    status: cards?.status,
    leadUrl: `${process.env.APP_URL}/api/v1/leads/${user?.buyerId}`,
    openingHoursMonday: formatTime(
      user?.businessDetailsId?.businessOpeningHours[0] || defaultValue
    ),
    openingHoursTuesday: formatTime(
      user?.businessDetailsId?.businessOpeningHours[1] || defaultValue
    ),
    openingHoursWednesday: formatTime(
      user?.businessDetailsId?.businessOpeningHours[2] || defaultValue
    ),
    openingHoursThursday: formatTime(
      user?.businessDetailsId?.businessOpeningHours[3] || defaultValue
    ),
    openingHoursFriday: formatTime(
      user?.businessDetailsId?.businessOpeningHours[4] || defaultValue
    ),
    openingHoursSaturday: formatTime(
      user?.businessDetailsId?.businessOpeningHours[5] || defaultValue
    ),
    openingHoursSunday: formatTime(
      user?.businessDetailsId?.businessOpeningHours[6] || defaultValue
    ),
  };
  if (user?.businessDetailsId?.businessLogo) {
    data.businessLogo = `${process.env.APP_URL}${user?.businessDetailsId?.businessLogo}`;
  }

  return data;
};

const defaultValue = {
  day: "",
  openTime: "00:00",
  closeTime: "00:00",
};

const formatTime = (data: any) => {
  let dayOpen;
  let dayClose;
  data["openTime"].split(":")[0] >= 12 ? (dayOpen = "pm") : (dayOpen = "am");
  data["closeTime"].split(":")[0] >= 12 ? (dayClose = "pm") : (dayClose = "am");

  const a = `${data["openTime"]}${dayOpen} - ${data["closeTime"]}${dayClose} `;
  return a;
};
