import axios from "axios";
import { checkAccess } from "../../app/Middlewares/serverAccess";
const POST = "post";
export const businessDetailsSubmission = ( data: any) => {
  data.APP_ENV=process.env.APP_ENV
  return new Promise((resolve, reject) => {
    let config = {
      method: POST,
      url: process.env.businessDetailsSubmission_WEBHOOK_URL,
      headers: {
        "Content-Type": "application/json",
        "API-KEY":process.env.businessDetailsSubmission_API_KEY
      },
      data: data,
    };
    if(checkAccess()){
          axios(config)
      .then(async (response) => {
        console.log("business data webhook hits successfully",response.data)
      })
      .catch((err) => {
        console.log("business data webhook hits error",err.response?.data);
      });
    }
    else{
      console.log("No Access for hitting business submission webhook to this "+ process.env.APP_ENV)
    }
  });
};
