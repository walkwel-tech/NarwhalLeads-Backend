import axios from "axios";
const POST = "post";
export const createNotesOnXero = (
  paramsToCreateContact: any,
  token: string
) => {
  const data = {
    "HistoryRecords": [
       {
        "Changes": "Note",
        "DateUTCString": new Date().toUTCString(),
        "DateUTC": new Date(),
        "User": "System Generated",
        "Details": paramsToCreateContact.email
      }
    ]
  }
  
  return new Promise(async (resolve, reject) => {
    const config = {
      method: POST,
      url: `${process.env.ADD_NOTES_TO_XERO}/${paramsToCreateContact.ContactID}/History`,
      headers: {
        "xero-tenant-id": process.env.XERO_TETANT_ID,
        Authorization: `Bearer ${token}`,
      },
      data: JSON.stringify(data),
    };
    axios(config)
      .then((data) => {
        resolve(data);
      })
      .catch(async (err) => {
        console.log("Xero Error whilte adding notes", err.response.data);
        reject(err);
      });
  });
};



