const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.setSubstitutionWrappers("{{", "}}");

export function send_email_forget_password(send_to: any, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-3175762a4b534d82968a264a356a921b",
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
    to: send_to, // Change to your recipient
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-69dcead271404a1d8a90aab2416bdc42",
    dynamic_template_data: {
      firstName: message?.firstName,
      lastName:message?.lastName,
      //@ts-ignore
      businessName:message?.businessName,
          //@ts-ignore
      phone:message?.phone,
      email:message?.email,
      credit:`£${message?.credits}`,
      paymentAmount: `£${message?.amount}`,
      cardNumberEnd:message?.cardNumberEnd,
      cardHolderName:message?.cardHolderName
  }
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent",message);
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_failed_autocharge(send_to: any, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-5ec8ce254e7d4fb08db52f7bbecac652",
    dynamic_template_data: {
      firstName: message?.firstName,
      lastName:message?.lastName,
      //@ts-ignore
      businessName:message?.businessName,
          //@ts-ignore
      phone:message?.phone,
      email:message?.email,
      credit:`£${message?.credits}`,
      paymentAmount: `£${message?.amount}`,
      cardNumberEnd:message?.cardNumberEnd,
      cardHolderName:message?.cardHolderName
  }
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
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-896d30fea5e74796bb67c2d6ed03b2f5",
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

export function send_email_for_new_registration(message: any) {
  const msg = {
    to: "leads@nmg.group", // Change to your recipient
    // to:"radhika.walkweltech@gmail.com",
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-4fffc73a3ca34d69a10b68d02c4b8c22",
    dynamic_template_data: {
      firstName:message?.firstName,
      lastName:message?.lastName,
      businessName:message?.businessName,
      phone:message?.phone,
      email:message?.email,
      industry:message?.industry,
      address:message?.address,
      city:message?.city,
      country:message?.country,
      openingHours:message?.openingHours,
      totalLeads:message?.totalLeads,
      monthlyLeads:message?.monthlyLeads,
      weeklyLeads:message?.weeklyLeads,
      dailyLeads:message?.dailyLeads,
      leadsHours:message?.leadsHours,
      area:message?.area
  }
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

export function send_email_to_invited_user(send_to: string, message: any) {
  console.log(message,"message")
  const msg = {
    to: send_to, // Change to your recipient
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-dad1bae4e3454fa8afea119f9de08b45",
    dynamic_template_data: {
      name: message.name,
      password: message.password
  }
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent",message);
    })
    .catch((error: any) => {
      console.error(error);
    });
}

export function send_email_for_new_lead(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-ca4e694d81ce4b3c8738b304a7a2368e",
    dynamic_template_data:{
      firstName:message.firstName,
        lastName: message.lastName,
        phone: message.phone,
        email: message.email
  }
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

export function send_email_for_new_lead_to_admin(message: any) {
  const msg = {
    to: "leads@nmg.group", // Change to your recipient
    // to: "radhika.walkweltech@gmail.com", // Change to your recipient

    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-8ca3c3f92cf94bb5a0a9ad6d4f1e106f",
    dynamic_template_data: {
      leadsCost: message.leadsCost,
      email: message.email,
      cardNumber: message.cardNumber,
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

export function send_email_for_total_lead(send_to: string, message: any) {
  const msg = {
    to: send_to, // Change to your recipient
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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

export function send_email_for_updated_details(message: any) {
  const msg = {
    to: "leads@nmg.group", // Change to your recipient
    // to:"kilp@yopmail.com",
    from: process.env.VERIFIED_SENDER_ON_SENDGRID,
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
    templateId: "d-ee02048102ac4a2eb4e7f48a8527ea32",
    dynamic_template_data: {
      firstName:message?.firstName,
      lastName:message?.lastName,
      businessName:message?.businessName,
      phone:message?.phone,
      email:message?.email,
      industry:message?.industry,
      address:message?.address,
      city:message?.city,
      country:message?.country,
      openingHours:message?.openingHours,
      totalLeads:message?.totalLeads,
      monthlyLeads:message?.monthlyLeads,
      weeklyLeads:message?.weeklyLeads,
      dailyLeads:message?.dailyLeads,
      leadsHours:message?.leadsHours,
      area:message?.area
    }

  };
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent",message);
    })
    .catch((error: any) => {
      console.error(error);
    });
}

