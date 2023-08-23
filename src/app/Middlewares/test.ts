
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgMail.setSubstitutionWrappers("{{", "}}");
export async function send_email_test() {

      const msg = {
        to: ["radhika.walkweltech@gmail.com","radhika@walkweltech.com"], // Change to your recipient
    // to: "radhika.walkweltech@gmail.com",    // to:message.email,
         from: {
          name: process.env.VERIFIED_SENDER_ON_SENDGRID_FROM_NAME,
          email:  process.env.VERIFIED_SENDER_ON_SENDGRID,
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
        subject: 'Hello world',
        text: 'Hello plain world!',
        html: '<p>Hello HTML world!</p>',
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