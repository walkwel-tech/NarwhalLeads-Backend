import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";

const POST = "post";

export const leadReprocessWebhook = async (leadData: Object) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.LEAD_REPROCESS_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY": process.env.LEAD_REPROCESS_SECRET_KEY,
      },
      data: leadData,
    };
    if (checkAccess()) {
      axios(config)
        .then(async (response) => {
          console.log(
            "Lead Process webhook hits successfully",
            response.data,
            new Date(),
            "Today's Date"
          );
        })
        .catch((err) => {
          console.log(
            "Lead Process webhook hits error",
            err.response?.data,
            new Date(),
            "Today's Date"
          );
        });
    } else {
      console.log(
        "No Access for hitting Lead Process webhook to this " +
          process.env.APP_ENV,
        new Date(),
        "Today's Date"
      );
    }
  });
};

// export const leadReprocessWebhookLeadCenter = async (leadData: Object) => {
//   return new Promise((resolve, reject) => {
//     let config = {
//       method: POST,
//       url: process.env.LEAD_CENTER_REPROCESS_WEBHOOK_URL,
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: "Token 7267059425d981834582f0fd9ddb3f987ee086f5",
//       },
//       data: leadData,
//     };
//     // if (checkAccess()) {
//     axios(config)
//       .then(async (response) => {
//         console.log(
//           "Lead center re-process webhook hits successfully",
//           response.data
//         );
//       })
//       .catch((err) => {
//         console.log(
//           "Lead center re-process webhook hits error",
//           err.response?.data
//         );
//       });
//     // } else {
//     //   console.log(
//     //     "No Access for hitting Lead Process webhook to this " +
//     //       process.env.APP_ENV
//     //   );
//     // }
//   });
// };
