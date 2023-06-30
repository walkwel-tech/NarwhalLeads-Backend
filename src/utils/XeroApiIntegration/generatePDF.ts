import { AccessToken } from "../../app/Models/AccessToken";

export const generatePDF = (ContactID:string,desc:string,amount:number) => {
  return new Promise(async (resolve, reject) => {
    var axios = require("axios");
    var data = JSON.stringify({
      Invoices: [
        {
          Type: "ACCREC",
          Contact: {
            ContactID: ContactID,
          },
          LineItems: [
            {
              Description: desc,
              Quantity: 1,
              UnitAmount: amount,
              AccountCode: "200",
              LineAmount: amount,
            },
          ],
          Date: new Date(),
          DueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
          Reference: "Website Design",
          Status: "AUTHORISED",
        },
      ],
    });
const token=await AccessToken.findOne()
    var config = {
      method: "post",
      url: process.env.GENERATE_PDF_URL,
      headers: {
        "xero-tenant-id": process.env.XERO_TETANT_ID,
        Authorization:
          "Bearer "+token?.access_token,
        Accept: "application/json",
        "Content-Type": "application/json",
 },
      data: data,
    };

    axios(config)
      .then(function (response: any ) {
        resolve(response)
      })
      .catch(function (error:any) {
        // reject(error)
        console.log(error.response?.data)
      });
  });
};
