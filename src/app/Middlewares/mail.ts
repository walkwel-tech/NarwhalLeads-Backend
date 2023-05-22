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
    templateId: "d-b1ec757ebd9a406c9f111ace4e22bf60",
    dynamic_template_data: {
      firstName: message.firstName, // replace {{name}} with Adebola
      amount: message.amount,
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
    templateId: " d-6d52bc3b4c92440ebc28326e535653b4",
    dynamic_template_data: {
      firstName: message.firstName, // replace {{name}} with Adebola
      amount: message.amount,
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
    templateId: "d-8f7c09b3dc3b4fb58c5a3a36bf8e82c9",
    dynamic_template_data: { message: message },
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
    templateId: "d-9ad5f523728b41948852f5201ce92a5d",
    dynamic_template_data: {
      email: message.email,
      firstName: message.firstName,
      lastName: message.lastName,
      businessIndustry: message.businessIndustry,
      businessName: message.businessName,
      businessLogo: message.businessLogo,
      businessSalesNumber: message.businessSalesNumber,
      businessAddress: message.businessAddress,
      businessCity: message.businessCity,
      businessCountry: message.businessCountry,
      businessPostCode: message.businessPostCode,
      businessOpeningHours: message.businessOpeningHours,
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

export function send_email_to_invited_user(send_to: string, message: any) {
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
    templateId: "d-a5c0bccebe634da08178213e35043f14",
    dynamic_template_data: {
      email: message.email, // replace {{name}} with Adebola
      password: message.password,
      companyName: message.businessName,
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
    templateId: "d-7c9f829934c0439293ea62212e1c5a07",
    dynamic_template_data: {
      firstName: message.firstName,
      cardNumber: message.cardNumber,
      leadsCost: message.leadCost,
      message: message.message,
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
    templateId: "d-9ad5f523728b41948852f5201ce92a5d",
    dynamic_template_data: {
      email: message.email,
      firstName: message.firstName,
      lastName: message.lastName,
      businessIndustry: message.businessIndustry,
      businessName: message.businessName,
      businessLogo: message.businessLogo,
      businessSalesNumber: message.businessSalesNumber,
      businessAddress: message.businessAddress,
      businessCity: message.businessCity,
      businessCountry: message.businessCountry,
      businessPostCode: message.businessPostCode,
      businessOpeningHours: message.businessOpeningHours,
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

