import {POST} from "../constantFiles/HttpMethods";
import {cmsUpdateWebhook} from "./cmsUpdateWebhook";
import {CardDetails} from "../../app/Models/CardDetails";
import {User} from "../../app/Models/User";

export const cmsUpdateBuyerWebhook = async (userId: String, cardId: String) => {
  const data = await hydrateUserDetails(userId, cardId);

  return new Promise(async (resolve, reject) => {
    try {
      await cmsUpdateWebhook("data/buyer", POST, data);
      resolve(data);
    } catch (err) {
      reject(err);
    }
  });
};

const hydrateUserDetails = async (userId: String, cardId: String) => {
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
    websiteLink: user?.businessDetailsId?.businessUrl,
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

    openingHoursMonday: formatScheduleTime(
      user?.businessDetailsId?.businessOpeningHours[0] || defaultScheduleValue
    ),
    openingHoursTuesday: formatScheduleTime(
      user?.businessDetailsId?.businessOpeningHours[1] || defaultScheduleValue
    ),
    openingHoursWednesday: formatScheduleTime(
      user?.businessDetailsId?.businessOpeningHours[2] || defaultScheduleValue
    ),
    openingHoursThursday: formatScheduleTime(
      user?.businessDetailsId?.businessOpeningHours[3] || defaultScheduleValue
    ),
    openingHoursFriday: formatScheduleTime(
      user?.businessDetailsId?.businessOpeningHours[4] || defaultScheduleValue
    ),
    openingHoursSaturday: formatScheduleTime(
      user?.businessDetailsId?.businessOpeningHours[5] || defaultScheduleValue
    ),
    openingHoursSunday: formatScheduleTime(
      user?.businessDetailsId?.businessOpeningHours[6] || defaultScheduleValue
    ),
  };

  if (user?.businessDetailsId?.businessLogo) {
    data.businessLogo = `${process.env.APP_URL}${user?.businessDetailsId?.businessLogo}`;
  }

  return data;
};

const defaultScheduleValue = {
  day: "",
  openTime: "00:00",
  closeTime: "00:00",
};

const formatScheduleTime = (data: any) => {
  let dayOpen;
  let dayClose;
  data["openTime"].split(":")[0] >= 12 ? (dayOpen = "pm") : (dayOpen = "am");
  data["closeTime"].split(":")[0] >= 12 ? (dayClose = "pm") : (dayClose = "am");

  return `${data["openTime"]}${dayOpen} - ${data["closeTime"]}${dayClose} `;
};
