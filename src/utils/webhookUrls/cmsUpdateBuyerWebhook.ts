import axios from "axios";
import { User } from "../../app/Models/User";
import { CardDetails } from "../../app/Models/CardDetails";

const POST = "post";
export const cmsUpdateBuyerWebhook = async (userId: String, cardId: String) => {
  const data = await userData(userId, cardId);
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.CMS_UPDATE_BUYER_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.BUSINESS_DETAILS_SUBMISSION_API_KEY,
      },
      data: data,
    };

    axios(config)
      .then(async (response) => {
        console.log(
          "cms update buyer webhook hits successfully",
          response.data
        );
      })
      .catch((err) => {
        console.log("cms update buyer webhook hits error", err.response?.data);
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
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    phoneNumber: user?.phoneNumber,
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
    businessIndustry: user?.businessDetailsId?.businessIndustry,
    businessDescription: user?.businessDetailsId?.businessDescription,
    businessName: user?.businessDetailsId?.businessName,
    address1: user?.businessDetailsId?.address1,
    address2: user?.businessDetailsId?.address2,
    businessSalesNumber: user?.businessDetailsId?.businessSalesNumber,
    businessAddress: user?.businessDetailsId?.businessAddress,
    businessCity: user?.businessDetailsId?.businessCity,
    businessPostCode: user?.businessDetailsId?.businessPostCode,
    businessOpeningHours: JSON.stringify(
      user?.businessDetailsId?.businessOpeningHours
    ),
    financeOffers: user?.userServiceId?.financeOffers,
    prices: user?.userServiceId?.prices,
    accreditations: user?.userServiceId?.accreditations,
    avgInstallTime: user?.userServiceId?.avgInstallTime,
    trustpilotReviews: user?.userServiceId?.trustpilotReviews,
    criteria: JSON.stringify(user?.userServiceId?.criteria),
    cardHolderName: cards?.cardHolderName,
    cardNumber: cards?.cardNumber,
    amount: cards?.amount,
    isDefault: cards?.isDefault,
    paymentMethod: cards?.paymentMethod,
    paymentSessionID: cards?.paymentSessionID,
    status: cards?.status,
    leadUrl: `${process.env.APP_URL}/api/v1/leads/${user?.buyerId}`,
  };
  if (user?.businessDetailsId?.businessLogo) {
    data.businessLogo = `${process.env.APP_URL}${user?.businessDetailsId?.businessLogo}`;
  }

  return data;
};
