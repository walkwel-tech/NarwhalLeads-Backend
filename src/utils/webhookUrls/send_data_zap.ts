import axios from "axios";
const POST = "post";
export const send_lead_data_to_zap = (url: string, data: any) => {
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
        console.log(response);
      })
      .catch((err) => {
        console.log(err);
      });
  });
};
