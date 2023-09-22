import axios from "axios";
const POST = "post";
export const sendLeadDataToZap = (url: string, data: any) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: url,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };
    axios(config)
      .then(async (response) => {
        console.log("lead zap webhook hits successfully")
      })
      .catch((err) => {
        console.log(err.response?.data);
      });
  });
};
