import axios from "axios";
import { AccessToken } from "../../app/Models/AccessToken";
let FormData = require("form-data");
const POST = "post";
export const createContactOnXero = (name: string, token: string) => {
  return new Promise(async (resolve, reject) => {
    const config = {
      method: POST,
      url: process.env.CREATE_CONTACT_ON_XERO,
      headers: {
        "xero-tenant-id": process.env.XERO_TETANT_ID,
        Authorization: `Bearer ${token}`,
      },
      data: {
        Name: name,
      },
    };
    axios(config)
      .then((data) => {
        resolve(data);
      })
      .catch(async (err) => {
        reject(err);
      });
  });
};

export const refreshToken = () => {
  return new Promise(async (resolve, reject) => {
    const token=await AccessToken.findOne()
    let data = new FormData();
    data.append("grant_type", "refresh_token");
    data.append("refresh_token", token?.refresh_token);
    data.append("client_id", process.env.CLIENT_ID);
    data.append("client_secret", process.env.CLIENT_SECRET);
    const config = {
      method: POST,
      url: process.env.REFRESH_TOKEN_URL,
      headers: {
        grant_type: "refresh_token",
      },
      data: data,
    };
    axios(config)
      .then(async (data) => {
        console.log('token updated');
        await AccessToken.updateMany(
          {},
          { $set: { access_token: data.data.access_token,refresh_token:data.data.refresh_token } },
          { new: true }
        );
        resolve(data);
      })
      .catch((err) => {
        console.log("error", err);
        // reject(err)
      });
  });
};
