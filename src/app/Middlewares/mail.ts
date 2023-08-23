import { SubscriberList } from "../Models/SubscriberList";

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
    templateId: "d-2ee5ddf374f442efbb2b2c95e0d4a539",
    dynamic_template_data: { name: message.name, password: message.password },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
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
    templateId: "d-7265bc9729b34fcb98cd0c081ddcb39f",
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
    templateId: "d-3bf15874bf854794b411dc470699bc6b",
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
    templateId: "d-6bdde3fdda1e43eaa72593b2f88f28e8",
    dynamic_template_data: { firstName: message },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
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
    templateId: "d-3045292d88954e578d2ba9a875724b90",
    dynamic_template_data: {
      firstName: message?.firstName,
      credits: `£${message?.credits}`,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
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
  const msg = {
    // to: "leads@nmg.group", // Change to your recipient
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
    templateId: "d-5871c5d48a8f477bb025a29961a17ebc",
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
    },
  };
  sgMail
    .sendMultiple(msg)
    .then(() => {
      console.log("Email sent");
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
    templateId: "d-36df0c800ea548218686a17005b78c6c",
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
    templateId: "d-ee68c14cdeb143e487467d8f3224c781",
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
    })
    .catch((error: any) => {
      console.error(error);
    });
}

// export function send_email_for_new_lead_to_admin(message: any) {
//   const msg = {
//     // to: "leads@nmg.group", // Change to your recipient
//     to: "radhika.walkweltech@gmail.com",
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
    templateId: "d-48fab52d62434e789ead7c09d1a84b3f ",
    dynamic_template_data: {
      totalLeads: message.totalLeads,
      leads: message.leads.email,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_lead_status(send_to: string, message: any) {
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
    templateId: "d-c0e2d4dbf28c4e8bafeff3942ab10690",
    dynamic_template_data: {
      status: message.status,
      name: message.name,
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
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
    templateId: "d-1ee9557d980d454cb250643d201308b6",
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
    },
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
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
    templateId: "d-7265bc9729b34fcb98cd0c081ddcb39f",
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
    templateId: "d-3bf15874bf854794b411dc470699bc6b ",
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
    })
    .catch((error: any) => {
      console.error(error);
    });
}
