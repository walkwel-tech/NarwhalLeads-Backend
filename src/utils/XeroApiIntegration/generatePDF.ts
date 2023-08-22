import { AccessToken } from "../../app/Models/AccessToken";
import { User } from "../../app/Models/User";

export const generatePDF = (ContactID:string,desc:string,amount:number) => {

  return new Promise(async (resolve, reject) => {
    const industry:any=await User.findOne({xeroContactId:ContactID}).populate("businessDetailsId")
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
              Description: `${industry?.businessDetailsId?.businessIndustry} - ${desc}`,
              Quantity: 1,
              UnitAmount: amount,
              AccountCode: "214",
              LineAmount: amount,
              LeadDepartment: industry?.businessDetailsId?.businessIndustry
            },
          ],
          Date: new Date(),
          DueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
          Reference: "",
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
        reject(error)
        // console.log(error.response?.data)
      });
  });
};
