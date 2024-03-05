// import { NotificationsParams } from "../../types/NotificationsParams";
import { NOTIFICATION_STATUS } from "../../utils/Enums/notificationType.enum";
import { APP_ENV } from "../../utils/Enums/serverModes.enum";
import { countryCurrency } from "../../utils/constantFiles/currencyConstants";
import {
  TEMPLATES_ID,
  TEMPLATES_TITLE,
} from "../../utils/constantFiles/email.templateIDs";
import { Notifications } from "../Models/Notifications";
import { User } from "../Models/User";
import { checkAccess } from "./serverAccess";
import logger from "../../utils/winstonLogger/logger";
// import { checkAccess } from "./serverAccess";

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.setSubstitutionWrappers("{{", "}}");

export function sendEmailForLeads(send_to: any, message: any) {
  const msg = {
    to: send_to, // Change to your recipient

    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-3175762a4b534d82968a264a356a921b",
    templateId: TEMPLATES_ID.ADMIN_LEADS,
    dynamic_template_data: {
      "first-name": message.firstName,
      "report-name": "Lead Export",
      "date-time": (new Date()).toUTCString(),
      headline: `${message.count} Leads Processed`,
    },
    attachments: [
      {
        content: message.file,
        filename: "Leads.xls", // Name of the attachment
        type: "application/vnd.ms-excel", // MIME type of the attachment for XLS format
        disposition: "attachment", // Display attachment as an attachment rather than inline
      },
    ],
  };

  // if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
  //   msg.to = process.env.SENDGRID_TO_EMAIL || "";
  // }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.ADMIN_LEADS,
        templateId: TEMPLATES_ID.ADMIN_LEADS,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error in sending mail:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.FORGET_PASSWORD,
        templateId: TEMPLATES_ID.FORGET_PASSWORD,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForgetPassword(send_to: any, message: any) {
  const msg = {
    to: send_to, // Change to your recipient

    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-3175762a4b534d82968a264a356a921b",
    templateId: TEMPLATES_ID.FORGET_PASSWORD,
    dynamic_template_data: { name: message.name, password: message.password },
  };

  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.FORGET_PASSWORD,
        templateId: TEMPLATES_ID.FORGET_PASSWORD,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.FORGET_PASSWORD,
        templateId: TEMPLATES_ID.FORGET_PASSWORD,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForRegistration(send_to: any, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-896d30fea5e74796bb67c2d6ed03b2f5",
    templateId: TEMPLATES_ID.REGISTRATION,
    dynamic_template_data: { firstName: message },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.REGISTRATION,
        templateId: TEMPLATES_ID.REGISTRATION,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.REGISTRATION,
        templateId: TEMPLATES_ID.REGISTRATION,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export async function sendEmailForNewRegistration(
  send_to: string,
  message: any
) {
  if (message.openingHours) {
    message.openingHours = mapHours(message.openingHours);
  }
  if (message.leadsHours) {
    message.leadsHours = mapHours(message.leadsHours);
  }
  // let Subscriber: string[] = [ process.env.ADMIN_EMAIL];
  // const data = await User.find({ role: RolesEnum.SUBSCRIBER });
  // data.map((subscriber) => Subscriber.push(subscriber.email));
  if (message?.financeOffers === false) {
    message.financeOffers = "No";
  }
  if (message?.financeOffers === true) {
    message.financeOffers = "Yes";
  }
  const msg = {
    // to: "", // Change to your recipient
    to: send_to,
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // isMultiple: true,

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-4fffc73a3ca34d69a10b68d02c4b8c22",
    templateId: TEMPLATES_ID.NEW_REGISTRATION,
    dynamic_template_data: {
      firstName: message?.firstName,
      lastName: message?.lastName,
      businessName: message?.businessName,
      phone: message?.phone,
      email: message?.email,
      industry: message?.industry,
      address: message?.address,
      city: message?.city,
      country: message?.country,
      businessLogo: message?.businessLogo,
      openingHours: message?.openingHours,
      dailyLeads: message?.dailyLeads,
      leadsHours: message?.leadsHours,
      leadApiUrl: message?.leadApiUrl,
      area: message?.area,
      financeOffers: message?.financeOffers,
      prices: message?.prices,
      accreditations: message?.accreditations,
      avgInstallTime: message?.avgInstallTime,
      criteria: message?.criteria,
      trustpilotReviews: message?.trustpilotReviews,
      leadCost: message?.leadCost,
      currencyCode: message?.currencyCode,
      mobilePrefixCode: message?.mobilePrefixCode,
      dailyCap: message?.dailyCap,
      weeklyCap: message?.weeklyLeads,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    //@ts-ignore
    msg.to = process.env.SENDGRID_TO_EMAIL;
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      // Subscriber.map((email) => {
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.NEW_REGISTRATION,
        templateId: TEMPLATES_ID.NEW_REGISTRATION,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
      // });
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      //TODO:
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.NEW_REGISTRATION,
        templateId: TEMPLATES_ID.NEW_REGISTRATION,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailToInvitedUser(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-dad1bae4e3454fa8afea119f9de08b45",
    templateId: TEMPLATES_ID.INVITED_USER,
    dynamic_template_data: {
      name: message.name,
      password: message.password,
      businessName: message.businessName,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.INVITED_USER,
        templateId: TEMPLATES_ID.INVITED_USER,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.INVITED_USER,
        templateId: TEMPLATES_ID.INVITED_USER,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForNewLead(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },
    // isMultiple: true,

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-ca4e694d81ce4b3c8738b304a7a2368e",
    templateId: TEMPLATES_ID.NEW_LEAD,
    dynamic_template_data: {
      userName: message.userName,
      firstName: message.firstName,
      lastName: message.lastName,
      phone: message.phone,
      email: message.email,
      id: message.id,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      // send_to.map(async (emails) => {
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.NEW_LEAD,
        templateId: TEMPLATES_ID.NEW_LEAD,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
      // });
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.NEW_LEAD,
        templateId: TEMPLATES_ID.NEW_LEAD,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmaiForTotalLead(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    templateId: TEMPLATES_ID.TOTAL_LEADS,
    dynamic_template_data: {
      totalLeads: message.totalLeads,
      leads: message.leads.email,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.TOTAL_LEADS,
        templateId: TEMPLATES_ID.TOTAL_LEADS,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.TOTAL_LEADS,
        templateId: TEMPLATES_ID.TOTAL_LEADS,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForLeadStatusReject(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    templateId: TEMPLATES_ID.LEAD_STATUS_REJECT,
    dynamic_template_data: {
      name: message.name,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.LEAD_STATUS_REJECT,
        templateId: TEMPLATES_ID.LEAD_STATUS_REJECT,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.LEAD_STATUS_REJECT,
        templateId: TEMPLATES_ID.LEAD_STATUS_REJECT,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForLeadStatusAccept(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    templateId: TEMPLATES_ID.LEAD_STATUS_ACCEPT,
    dynamic_template_data: {
      name: message.name,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.LEAD_STATUS_ACCEPT,
        templateId: TEMPLATES_ID.LEAD_STATUS_ACCEPT,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.LEAD_STATUS_ACCEPT,
        templateId: TEMPLATES_ID.LEAD_STATUS_ACCEPT,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

const mapHours = (hours: any) => {
  if (hours.openingHours) {
    hours.openingHours = hours?.openingHours?.map((item: any, idx: number) => {
      const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      if (item.day === "") {
        item.day = days[idx];
      }
      return item;
    });
  }

  return hours || [];
};

export function sendEmailForUpdatedDetails(message: any) {
  if (message.openingHours) {
    message.openingHours = mapHours(message.openingHours);
  }
  if (message.leadsHours) {
    message.leadsHours = mapHours(message.leadsHours);
  }

  const msg = {
    to: process.env.ADMIN_EMAIL, // Change to your recipient
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-ee02048102ac4a2eb4e7f48a8527ea32",
    templateId: TEMPLATES_ID.USER_UPDATE_DETAILS,
    dynamic_template_data: {
      firstName: message?.firstName,
      lastName: message?.lastName,
      businessName: message?.businessName,
      phone: message?.phone,
      email: message?.email,
      industry: message?.industry,
      address: message?.address,
      city: message?.city,
      country: message?.country,
      openingHours: message?.openingHours,
      totalLeads: message?.totalLeads,
      monthlyLeads: message?.monthlyLeads,
      weeklyLeads: message?.weeklyLeads,
      dailyLeads: message?.dailyLeads,
      leadsHours: message?.leadsHours,
      area: message?.area,
      leadCost: message?.leadCost,
      businessLogo: message?.logo,
      currencyCode: message?.currencyCode,
      mobilePrefixCode: message?.mobilePrefixCode,
      dailyCap: message?.dailyCap,
    },
  };
  if (checkAccess()) {
    if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
      msg.to = process.env.SENDGRID_TO_EMAIL || "";
    }
    sgMail
      .send(msg)
      .then(() => {
        logger.info("Email sent");
        const params = {
          email: process.env.ADMIN_EMAIL,
          title: TEMPLATES_TITLE.USER_UPDATE_DETAILS,
          templateId: TEMPLATES_ID.USER_UPDATE_DETAILS,
          status: NOTIFICATION_STATUS.SUCCESS,
        };
        saveNotifications(params);
      })
      .catch((error: any) => {
        logger.error("Error:", error);
        const params = {
          email: process.env.ADMIN_EMAIL,
          title: TEMPLATES_TITLE.USER_UPDATE_DETAILS,
          templateId: TEMPLATES_ID.USER_UPDATE_DETAILS,
          status: NOTIFICATION_STATUS.FAIL,
        };
        saveNotifications(params);
      });
  } else {
    logger.info("Emails access only on production");
  }
}

export function sendEmailForPaymentSuccess(send_to: any, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-69dcead271404a1d8a90aab2416bdc42",
    templateId: TEMPLATES_ID.PAYMENT_SUCCESS,
    dynamic_template_data: {
      firstName: message?.firstName,
      credit: `${message.currency}${message?.credits}`,
      paymentAmount: `${message.currency}${message?.amount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
      businessName: message?.businessName,
      isIncVat: message.isIncVat,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.PAYMENT_SUCCESS,
        templateId: TEMPLATES_ID.PAYMENT_SUCCESS,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.PAYMENT_SUCCESS,
        templateId: TEMPLATES_ID.PAYMENT_SUCCESS,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForPaymentFailure(send_to: any, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-69dcead271404a1d8a90aab2416bdc42",
    templateId: TEMPLATES_ID.PAYMENT_FAIL,
    dynamic_template_data: {
      firstName: message?.firstName,
      credit: `${message.currency}${message?.credits}`,
      paymentAmount: `${message.currency}${message?.amount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
      businessName: message?.businessName,
      isIncVat: message.isIncVat,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.PAYMENT_FAIL,
        templateId: TEMPLATES_ID.PAYMENT_FAIL,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.PAYMENT_FAIL,
        templateId: TEMPLATES_ID.PAYMENT_FAIL,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForFullySignupToAdmin(message: any) {
  const msg = {
    to: process.env.ADMIN_EMAIL, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-69dcead271404a1d8a90aab2416bdc42",
    templateId: "d-90a17909d72a45089b16d690f3d666d9",
    dynamic_template_data: {
      firstName: message?.firstName,
      businessName: message?.businessName,
      lastName: message.lastName,
      email: message.email,
      phoneNumber: message.phoneNumber,
      buyerId: message.buyerId,
      daily: message?.daily,
      leadSchedule: message?.leadSchedule,
      postCodeTargettingList: message?.postCodeTargettingList,
      businessIndustry: message?.businessIndustry,
      businessDescription: message?.businessDescription,
      businessLogo: `${process.env.APP_URL}${message?.businessLogo}`,
      address1: message?.address1,
      businessSalesNumber:
        "+" + message?.mobilePrefixCode + " " + message?.businessSalesNumber,
      businessAddress: message?.businessAddress,
      businessCity: message?.businessCity,
      businessPostCode: message?.businessPostCode,
      businessOpeningHours: message?.businessOpeningHours,
      financeOffers: message?.financeOffers,
      prices: message?.prices,
      accreditations: message?.accreditations,
      avgInstallTime: message?.avgInstallTime,
      trustpilotReviews: message?.trustpilotReviews,
      criteria: message?.criteria,
      leadCost:
        countryCurrency.find(({ value }) => value === message?.currency)
          ?.label +
        " " +
        message?.leadCost,
      area: message?.area,
      computedLead: +message?.daily + +message?.computedCap,
      weeklyCap: message?.weeklyCap,
      postCodeType: message?.type,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: process.env.ADMIN_EMAIL,
        title: TEMPLATES_TITLE.PAYMENT_SUCCESS_TO_ADMIN,
        templateId: TEMPLATES_ID.PAYMENT_SUCCESS_TO_ADMIN,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: process.env.ADMIN_EMAIL,
        title: TEMPLATES_TITLE.PAYMENT_SUCCESS_TO_ADMIN,
        templateId: TEMPLATES_ID.PAYMENT_SUCCESS_TO_ADMIN,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //     console.log("Emails access only on production");
  // }
}

export function sendEmailToInvitedAdmin(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-dad1bae4e3454fa8afea119f9de08b45",
    templateId: TEMPLATES_ID.INVITED_ADMIN,
    dynamic_template_data: {
      name: message.name,
      password: message.password,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "" || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.INVITED_ADMIN,
        templateId: TEMPLATES_ID.INVITED_ADMIN,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.INVITED_ADMIN,
        templateId: TEMPLATES_ID.INVITED_ADMIN,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailToInvitedAccountManager(
  send_to: string,
  message: any
) {
  const msg = {
    to: send_to, // Change to your recipient
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-dad1bae4e3454fa8afea119f9de08b45",
    templateId: TEMPLATES_ID.INVITED_ACCOUNT_MANAGER,
    dynamic_template_data: {
      name: message.name,
      password: message.password,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "" || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.INVITED_ACCOUNT_MANAGER,
        templateId: TEMPLATES_ID.INVITED_ACCOUNT_MANAGER,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.INVITED_ACCOUNT_MANAGER,
        templateId: TEMPLATES_ID.INVITED_ACCOUNT_MANAGER,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForBelow5LeadsPending(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    templateId: TEMPLATES_ID.BELOW_5_LEADS_PENDING,
    dynamic_template_data: {
      name: message.name,
      credits: message.credits,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.BELOW_5_LEADS_PENDING,
        templateId: TEMPLATES_ID.BELOW_5_LEADS_PENDING,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.BELOW_5_LEADS_PENDING,
        templateId: TEMPLATES_ID.BELOW_5_LEADS_PENDING,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailForOutOfFunds(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    templateId: TEMPLATES_ID.OUT_OF_FUNDS,
    dynamic_template_data: {
      name: message.name,
      credits: message.credits,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      logger.info("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.OUT_OF_FUNDS,
        templateId: TEMPLATES_ID.OUT_OF_FUNDS,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      logger.error("Error:", error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.OUT_OF_FUNDS,
        templateId: TEMPLATES_ID.OUT_OF_FUNDS,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  // } else {
  //   console.log("Emails access only on production");
  // }
}

export function sendEmailToRemindUser25PercentSignup(
  send_to: string,
  message: any
) {
  const msg = {
    to: send_to, // Change to your recipient
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },
    // isMultiple: true,

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-dad1bae4e3454fa8afea119f9de08b45",
    templateId: "d-d39ac61c21a84352b80dabd6a3d0f238",
    dynamic_template_data: {
      name: message.name,
    },
  };
  if (checkAccess()) {
    sgMail
      .send(msg)
      .then(() => {
        logger.info("Email sent");
        // send_to.map(async (emails) => {
        const params = {
          email: send_to,
          title: TEMPLATES_TITLE.USER_25_PERCENT_SIGNUP,
          templateId: TEMPLATES_ID.USER_25_PERCENT_SIGNUP,
          status: NOTIFICATION_STATUS.SUCCESS,
        };
        saveNotifications(params);
        // });
      })
      .catch((error: any) => {
        logger.error("Error:", error);
        const params = {
          email: send_to,
          title: TEMPLATES_TITLE.USER_25_PERCENT_SIGNUP,
          templateId: TEMPLATES_ID.USER_25_PERCENT_SIGNUP,
          status: NOTIFICATION_STATUS.FAIL,
        };
        saveNotifications(params);
      });
  } else {
    console.log("Emails access only on production");
  }
}

export function sendEmailForRequireActionAutocharge(
  send_to: any,
  message: any
) {
  const msg = {
    to: send_to, /// Change to your recipient
    // to: "radhika.walkweltech@gmail.com",
    from: {
      name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
      email: process.env.VERIFIED_SENDER_ON_SENDGRID,
    },
    // Change to your verified sender
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
      openTracking: {
        enable: false,
      },
    },

    // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
    // templateId: "d-69dcead271404a1d8a90aab2416bdc42",
    templateId: TEMPLATES_ID.AUTO_CHARGE_STATUS_REQUIRE_ACTION,
    dynamic_template_data: {
      firstName: message?.firstName,
      lastName: message?.lastName,
      //@ts-ignore
      businessName: message?.businessName,
      //@ts-ignore
      phone: message?.phone,
      email: message?.email,
      credit: `${message.currency}${message?.credits}`,
      paymentAmount: `${message.currency}${message?.paymentAmount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
      isIncVat: message.isIncVat,
    },
  };
  // if (checkAccess()) {
  if (process.env.APP_ENV !== APP_ENV.PRODUCTION) {
    msg.to = process.env.SENDGRID_TO_EMAIL || "";
  }
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.AUTO_CHARGE_STATUS_REQUIRE_ACTION,
        templateId: TEMPLATES_ID.AUTO_CHARGE_STATUS_REQUIRE_ACTION,
        status: NOTIFICATION_STATUS.SUCCESS,
      };
      saveNotifications(params);
    })
    .catch((error: any) => {
      console.error(error);
      const params = {
        email: send_to,
        title: TEMPLATES_TITLE.AUTO_CHARGE_STATUS_REQUIRE_ACTION,
        templateId: TEMPLATES_ID.AUTO_CHARGE_STATUS_REQUIRE_ACTION,
        status: NOTIFICATION_STATUS.FAIL,
      };
      saveNotifications(params);
    });
  //   } else {
  //     console.log("Emails access only on production");
  //   }
}

async function saveNotifications(params: any) {
  const user = await User.findOne({ email: params?.email });

  let dataToSave;
  if (user) {
    dataToSave = {
      userId: user?.id,
      title: params.title,
      templateId: params.templateId,
      status: params.status,
    };
  }
  await Notifications.create(dataToSave);
}
