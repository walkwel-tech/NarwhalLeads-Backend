import axios from "axios";
const POST = "post";
export const business_details_submission = ( data: any) => {
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: "",
      headers: {
        "Content-Type": "application/json",
        "API-KEY":process.env.BUSINESS_DETAILS_SUBMISSION_API_KEY
      },
      data: data,
    };
    axios(config)
      .then(async (response) => {
        console.log("business data webhook hits successfully",response.data)
      })
      .catch((err) => {
        console.log(err.response?.data);
      });
  });
};
