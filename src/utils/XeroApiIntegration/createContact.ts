import axios from "axios";
import { AccessToken } from "../../app/Models/AccessToken";
import { User } from "../../app/Models/User";
import { BusinessDetails } from "../../app/Models/BusinessDetails";
import { createNotesOnXero } from "./addNotesToCustomer";
let FormData = require("form-data");
const POST = "post";
export const createContactOnXero = (
  paramsToCreateContact: any,
  token: string
) => {
  let data:any = {
    Name: paramsToCreateContact?.businessName,
    FirstName: paramsToCreateContact?.firstName,
    LastName: paramsToCreateContact?.lastName,
    // EmailAddress: paramsToCreateContact.emailAddress,
    Addresses: [
      {
        AddressType: "POBOX",
        AddressLine1: paramsToCreateContact?.addressLine1,
        AddressLine2: paramsToCreateContact?.addressLine2,
        City: paramsToCreateContact?.city,
        PostalCode: paramsToCreateContact?.postalCode,
      },
    ],
  };
  if(paramsToCreateContact.ContactID){
    data.ContactID=paramsToCreateContact.ContactID
  }
  return new Promise(async (resolve, reject) => {
    const config = {
      method: POST,
      url: process.env.CREATE_CONTACT_ON_XERO,
      headers: {
        "xero-tenant-id": process.env.XERO_TETANT_ID,
        Authorization: `Bearer ${token}`,
        // "xero-tenant-id": "f3d6705e-2e71-437f-807f-5d0893c0285b",
        // Authorization: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFDQUY4RTY2NzcyRDZEQzAyOEQ2NzI2RkQwMjYxNTgxNTcwRUZDMTkiLCJ0eXAiOiJKV1QiLCJ4NXQiOiJISy1PWm5jdGJjQW8xbkp2MENZVmdWY09fQmsifQ.eyJuYmYiOjE2OTMzODM4MjMsImV4cCI6MTY5MzM4NTYyMywiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS54ZXJvLmNvbSIsImF1ZCI6Imh0dHBzOi8vaWRlbnRpdHkueGVyby5jb20vcmVzb3VyY2VzIiwiY2xpZW50X2lkIjoiNjJDRDNGQkQyNENENEZGMUI4RUFGNEMyQzNGODI0NkYiLCJ4ZXJvX3VzZXJpZCI6IjQxYjlhNWJkLTM3YzEtNDIyNy1hNzkyLTdmYjkxYWRmOGIyNCIsImp0aSI6IjVDRTk0RUEzMzhDMEY3MEVEMDJERDJBNkRGNjAwQ0UzIiwiYXV0aGVudGljYXRpb25fZXZlbnRfaWQiOiI4YTIwODhmNS1iNzg4LTRkYzAtYTZlZS1iNGQ5YjIyODlkZGEiLCJzY29wZSI6WyJhY2NvdW50aW5nLmF0dGFjaG1lbnRzIiwiYWNjb3VudGluZy5idWRnZXRzLnJlYWQiLCJhY2NvdW50aW5nLmNvbnRhY3RzIiwiYWNjb3VudGluZy5jb250YWN0cy5yZWFkIiwiYWNjb3VudGluZy5yZXBvcnRzLnJlYWQiLCJhY2NvdW50aW5nLnNldHRpbmdzIiwiYWNjb3VudGluZy5zZXR0aW5ncy5yZWFkIiwiYWNjb3VudGluZy50cmFuc2FjdGlvbnMiLCJhY2NvdW50aW5nLnRyYW5zYWN0aW9ucy5yZWFkIl19.LzyLxkPzkJPFfs8cdCsvIL0LupsGeevbmBTtb9x7R8Z_PZmcTZJNN0J5Gnb9HbqeB_So3KYnR6mzDi9GBvx2kCwD-vD38TLYmgQBHOUpXvtvq7x71kv-NnJTubCHlWE2MCw9ZiYjCPvJPCF3uXtOVDbcfd3mNinr1yCpWvYhvr59N6U42BsmluO6T7wcfOdQzcq1_NHP6JlmVU87iW4nYoh0s1z5lo6sHQHtSvJ9G4jrDtHnJOqrFxxrPue4fouyNof8_sTAH6cyYH_PwqV7v2GnMVyyR_ZS9tkfkz-uHD6qZWGs4uWMt9OYyoX1eQywh0HGp7Jx3MBCUPanUA70rA",
      },
      data: JSON.stringify(data),
    };
    axios(config)
      .then((data) => {
        const params={contactID:data.data.Contacts[0].ContactID,email:paramsToCreateContact.emailAddress}
        createNotesOnXero(params,token).then(()=>console.log("notes added on xero")).catch((err)=>console.log("error while adding notes on xero."))
        resolve(data);
      })
      .catch(async (err) => {
        console.log("Xero Error", err.response.data);
        reject(err);
      });
  });
};

export const addUserXeroId = async (userId: string) => {
  let user =await User.findById(userId);
  let business=await BusinessDetails.findById(user?.businessDetailsId)
  const paramsToCreateContact={
    name : user?.firstName + " " + user?.lastName,
    firstName:user?.firstName,
    lastName:user?.lastName,
    emailAddress:user?.email,
    addressLine1:business?.businessIndustry,
    addressLine2:business?.businessName,
    city:business?.businessCity,
    postalCode:business?.businessPostCode
  }
  let token: any = await AccessToken.findOne();
  //@ts-ignore
  await refreshToken();
  token = await AccessToken.findOne();
  const res = await createContactOnXero(paramsToCreateContact, token?.access_token);
  await User.findOneAndUpdate(
    { _id: userId },
    //@ts-ignore
    { $set: { xeroContactId: res?.data?.Contacts[0]?.ContactID } }
  );
  //@ts-ignore
  user = await User.findById(userId);

  return user;
};

export const refreshTokenOld = () => {
  return new Promise(async (resolve, reject) => {
    const token = await AccessToken.findOne();
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
        console.log("token updated");
        await AccessToken.updateMany(
          {},
          {
            $set: {
              access_token: data.data.access_token,
              refresh_token: data.data.refresh_token,
            },
          },
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
  return new Promise(async (resolve, reject) => {
    let data = new FormData();
    data.append("grant_type", "client_credentials");
    data.append(
      "scope",
      "accounting.transactions accounting.transactions.read accounting.contacts accounting.contacts.read accounting.reports.read accounting.budgets.read accounting.settings accounting.settings.read accounting.attachments"
    );

    let config = {
      method: "post",
      url: `${process.env.REFRESH_TOKEN_URL}`,
      headers: {
        Authorization: `Basic ${process.env.XERO_CLIENT_ID_CLIENT_SECRET_BASE64_ENCODE}`,
      },
      data: data,
    };

    axios(config)
      .then(async function (response) {
        await AccessToken.updateMany(
          {},
          {
            $set: {
              access_token: response.data.access_token,
              refresh_token: "",
            },
          },
          { new: true }
        );
        // console.log(JSON.stringify(response.data));
        resolve(response);
      })
      .catch(function (error) {
        // console.log(error);
        reject(error);
      });
  });
};
