import axios from "axios";
import { AccessToken } from "../../app/Models/AccessToken";
import { User } from "../../app/Models/User";
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
        console.log('Xero Error',err.response.data)
        reject(err);
        
      });
  });
};

export const addUserXeroId = async (userId:string)=>{
  let user = User.findById(userId);
  let token: any = await AccessToken.findOne();
  //@ts-ignore
    const fullName = user?.firstName + " " + user?.lastName;
    await refreshToken()
    token = await AccessToken.findOne();
    const res = await createContactOnXero(fullName, token?.access_token)
    await User.findOneAndUpdate(
      { _id: userId },
      //@ts-ignore
      { $set: { xeroContactId: res?.data?.Contacts[0]?.ContactID } }
    );
    //@ts-ignore
    user = await User.findById(userId);
    
    return user;
}

export const refreshTokenOld = () => {
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
        console.log("error", err.response?.data);
        // reject(err)
      });
  });
};
export const refreshToken = () => {
  return new Promise(async(resolve,reject)=>{
      let data = new FormData();
  data.append('grant_type', 'client_credentials');
  data.append('scope', 'accounting.transactions accounting.transactions.read accounting.contacts accounting.contacts.read accounting.reports.read accounting.budgets.read accounting.settings accounting.settings.read accounting.attachments');
  
  let config = {
    method: 'post',
    url: `${process.env.REFRESH_TOKEN_URL}`,
    headers: { 
      'Authorization': `Basic ${process.env.XERO_CLIENT_ID_CLIENT_SECRET_BASE64_ENCODE}`, 
    },
    data : data
  };
  
  axios(config)
  .then(async function (response) {
    await AccessToken.updateMany(
      {},
      { $set: { access_token: response.data.access_token,refresh_token:""} },
      { new: true }
    );
    // console.log(JSON.stringify(response.data));
    resolve(response)
  })
  .catch(function (error) {
    // console.log(error);
    reject(error)
  });
  })

};