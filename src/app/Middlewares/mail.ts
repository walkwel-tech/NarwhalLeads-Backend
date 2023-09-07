import { NotificationsParams } from "../../types/NotificationsParams";
import { TEMPLATES_ID } from "../../utils/constantFiles/email.templateIDs";
import { Notifications } from "../Models/Notifications";
import { SubscriberList } from "../Models/SubscriberList";
import { User } from "../Models/User";

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.setSubstitutionWrappers("{{", "}}");

export function send_email_forget_password(send_to: any, message: any) {
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
    // templateId: "d-3175762a4b534d82968a264a356a921b",
    templateId: TEMPLATES_ID.FORGET_PASSWORD,
    dynamic_template_data: { name: message.name, password: message.password },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'FORGET_PASSWORD',
        templateId:TEMPLATES_ID.FORGET_PASSWORD
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_autocharge(send_to: any, message: any) {
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
    templateId: TEMPLATES_ID.AUTO_CHARGE,
    dynamic_template_data: {
      firstName: message?.firstName,
      lastName: message?.lastName,
      //@ts-ignore
      businessName: message?.businessName,
      //@ts-ignore
      phone: message?.phone,
      email: message?.email,
      credit: `£${message?.credits}`,
      paymentAmount: `£${message?.amount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'AUTO_CHARGE',
        templateId:TEMPLATES_ID.AUTO_CHARGE
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_failed_autocharge(send_to: any, message: any) {
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
    // templateId: "d-5ec8ce254e7d4fb08db52f7bbecac652",
    templateId: TEMPLATES_ID.AUTO_CHARGE_FAIL,
    dynamic_template_data: {
      firstName: message?.firstName,
      lastName: message?.lastName,
      //@ts-ignore
      businessName: message?.businessName,
      //@ts-ignore
      phone: message?.phone,
      email: message?.email,
      credit: `£${message?.credits}`,
      paymentAmount: `£${message?.amount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'AUTO_CHARGE_FAIL',
        templateId:TEMPLATES_ID.AUTO_CHARGE_FAIL
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_registration(send_to: any, message: any) {
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

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'REGISTRATION',
        templateId:TEMPLATES_ID.REGISTRATION
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_add_credits(send_to: any, message: any) {
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
    templateId: TEMPLATES_ID.ADD_CREDITS,
    dynamic_template_data: {
      firstName: message?.firstName,
      credits: `£${message?.credits}`,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'ADD_CREDITS',
        templateId:TEMPLATES_ID.ADD_CREDITS
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export async function send_email_for_new_registration(message: any) {
  if (message.openingHours) {
    message.openingHours = mapHours(message.openingHours);
  }
  if (message.leadsHours) {
    message.leadsHours = mapHours(message.leadsHours);
  }
  let Subscriber: string[] = ["leads@nmg.group"];
  const data = await SubscriberList.find();
  data.map((i) => Subscriber.push(i.email));
  if(message?.financeOffers===false){
    message.financeOffers="No"
  }
  if(message?.financeOffers===true){
    message.financeOffers="Yes"
  }
  const msg = {
    // to: "radhika.walkweltech@gmail.com", // Change to your recipient
    to: Subscriber,
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
    isMultiple :true,

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
      financeOffers:message?.financeOffers,
      prices:message?.prices,
      accreditations:message?.accreditations,
      avgInstallTime:message?.avgInstallTime,
      criteria:message?.criteria,
      trustpilotReviews:message?.trustpilotReviews,
      leadCost:message?.leadCost
    },
  };
  console.log("msg",msg)
  sgMail
    .sendMultiple(msg)
    .then(() => {
      console.log("Email sent");
      Subscriber.map((i)=>{
        const params={
          email:i,
          title:'NEW_REGISTRATION',
          templateId:TEMPLATES_ID.NEW_REGISTRATION
        }
        saveNotifications(params)
      })
     
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_to_invited_user(send_to: string, message: any) {
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

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'INVITED_USER',
        templateId:TEMPLATES_ID.INVITED_USER
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_new_lead(send_to: string, message: any) {
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
    // templateId: "d-ca4e694d81ce4b3c8738b304a7a2368e",
    templateId:TEMPLATES_ID.NEW_LEAD,
    dynamic_template_data: {
      userName: message.userName,
      firstName: message.firstName,
      lastName: message.lastName,
      phone: message.phone,
      email: message.email,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'NEW_LEAD',
        templateId:TEMPLATES_ID.NEW_LEAD
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

// export function send_email_for_new_lead_to_admin(message: any) {
//   const msg = {
//     // to: "leads@nmg.group", // Change to your recipient
//      from: {
//     name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
//     email:  process.env.VERIFIED_SENDER_ON_SENDGRID,
// },
//     // Change to your verified sender
//     trackingSettings: {
//       clickTracking: {
//         enable: false,
//         enableText: false,
//       },
//       openTracking: {
//         enable: false,
//       },
//     },
//     // html: "<strong>and easy to do anywhere, even with Node.js</strong>",
//     templateId: "d-8ca3c3f92cf94bb5a0a9ad6d4f1e106f",
//     dynamic_template_data: {
//       leadsCost: message.leadsCost,
//       email: message.email,
//       cardNumber: message.cardNumber,
//     },
//   };

//   sgMail
//     .send(msg)
//     .then(() => {
//       console.log("Email sent");
//     })
//     .catch((error: any) => {
//       console.error(error);
//     });
// }

export function send_email_for_total_lead(send_to: string, message: any) {
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

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'TOTAL_LEADS',
        templateId:TEMPLATES_ID.TOTAL_LEADS
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_lead_status_reject(send_to: string, message: any) {
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

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'LEAD_STATUS_REJECT',
        templateId:TEMPLATES_ID.LEAD_STATUS_REJECT
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}


export function send_email_for_lead_status_accept(send_to: string, message: any) {
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
    templateId:TEMPLATES_ID.LEAD_STATUS_ACCEPT,
    dynamic_template_data: {
      name: message.name,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'LEAD_STATUS_ACCEPT',
        templateId:TEMPLATES_ID.LEAD_STATUS_ACCEPT
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
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

export function send_email_for_updated_details(message: any) {
  if (message.openingHours) {
    message.openingHours = mapHours(message.openingHours);
  }
  if (message.leadsHours) {
    message.leadsHours = mapHours(message.leadsHours);
  }

  const msg = {
    to: "leads@nmg.group", // Change to your recipient
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
    templateId:TEMPLATES_ID.USER_UPDATE_DETAILS,
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
      leadCost:message?.leadCost,
      businessLogo:message?.logo
    },
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:"leads@nmg.group",
        title:'USER_UPDATE_DETAILS',
        templateId:TEMPLATES_ID.USER_UPDATE_DETAILS
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_payment_success(send_to: any, message: any) {
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
    templateId:TEMPLATES_ID.PAYMENT_SUCCESS,
    dynamic_template_data: {
      firstName: message?.firstName,
      credit: `£${message?.credits}`,
      paymentAmount: `£${message?.amount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
      businessName:message?.businessName
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'PAYMENT_SUCCESS',
        templateId:TEMPLATES_ID.PAYMENT_SUCCESS
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_payment_failure(send_to: any, message: any) {
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
      credit: `£${message?.credits}`,
      paymentAmount: `£${message?.amount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
      businessName:message?.businessName
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'PAYMENT_FAIL',
        templateId:TEMPLATES_ID.PAYMENT_FAIL
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_payment_success_to_admin(message: any) {
  const msg = {
    to: "leads@nmg.group", // Change to your recipient
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
    templateId: "d-f341f49885964b52a0523e1e083aa2d7",
    dynamic_template_data: {
      firstName: message?.firstName,
      credit: `£${message?.credits}`,
      paymentAmount: `£${message?.amount}`,
      cardNumberEnd: message?.cardNumberEnd,
      cardHolderName: message?.cardHolderName,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:"leads@nmg.group",
        title:'PAYMENT_SUCCESS_TO_ADMIN',
        templateId:TEMPLATES_ID.PAYMENT_SUCCESS_TO_ADMIN
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_to_invited_admin(send_to: string, message: any) {
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
      businessName: message.businessName,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
      const params={
        email:send_to,
        title:'INVITED_ADMIN',
        templateId:TEMPLATES_ID.INVITED_ADMIN
      }
      saveNotifications(params)
    })
    .catch((error: any) => {
      console.error(error);
    });
}

async function saveNotifications(params:NotificationsParams){
const user=await User.findOne({email:params?.email})
const dataToSave={
  userId:user?.id,
  title:params.title,
  templateId:params.templateId,
}
await Notifications.create(dataToSave)
}