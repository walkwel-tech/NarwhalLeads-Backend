import { AccessToken } from "../../app/Models/AccessToken";
import { User } from "../../app/Models/User";
// import { transactionTitle } from "../Enums/transaction.title.enum";
var axios = require("axios");

export const generatePDF = (
  ContactID: string,
  desc: string,
  amount: number
) => {
  return new Promise(async (resolve, reject) => {
    const industry: any = await User.findOne({
      xeroContactId: ContactID,
    }).populate("businessDetailsId");
    const quantity = amount / parseInt(industry.leadCost);
    console.log(
      "IN XERO PDF--- QUNATITY",
      amount,
      parseInt(industry.leadCost),
      industry.leadCost
    );
    let unitAmount=industry.leadCost
    // if(desc===transactionTitle.FREE_CREDITS){
    //   unitAmount=0
    //       }
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
              //@ts-ignore
              Quantity: parseInt(quantity),
              UnitAmount: unitAmount,
              AccountCode: "214",
              LineAmount: amount,
              LeadDepartment: industry?.businessDetailsId?.businessIndustry,
            },
          ],
          Date: new Date(),
          DueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
          Reference: "",
          Status: "AUTHORISED",
        },
      ],
    });

    const token = await AccessToken.findOne();
    var config = {
      method: "post",
      url: process.env.GENERATE_PDF_URL,
      headers: {
        "xero-tenant-id": process.env.XERO_TETANT_ID,
        // "xero-tenant-id": "f3d6705e-2e71-437f-807f-5d0893c0285b",
        Authorization: "Bearer " + token?.access_token,
        // Authorization: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFDQUY4RTY2NzcyRDZEQzAyOEQ2NzI2RkQwMjYxNTgxNTcwRUZDMTkiLCJ0eXAiOiJKV1QiLCJ4NXQiOiJISy1PWm5jdGJjQW8xbkp2MENZVmdWY09fQmsifQ.eyJuYmYiOjE2OTQwNjMyMTUsImV4cCI6MTY5NDA2NTAxNSwiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS54ZXJvLmNvbSIsImF1ZCI6Imh0dHBzOi8vaWRlbnRpdHkueGVyby5jb20vcmVzb3VyY2VzIiwiY2xpZW50X2lkIjoiNjJDRDNGQkQyNENENEZGMUI4RUFGNEMyQzNGODI0NkYiLCJ4ZXJvX3VzZXJpZCI6IjQxYjlhNWJkLTM3YzEtNDIyNy1hNzkyLTdmYjkxYWRmOGIyNCIsImp0aSI6IkM5OTFEQzc5RjM4MTQ5NUI4MkY5MTZGNTI2NDEzQzQ1IiwiYXV0aGVudGljYXRpb25fZXZlbnRfaWQiOiI2YjNiNjQyOC0xNTAxLTQwNzAtYjYxYy1kMTM5ZGJiNjllZWIiLCJzY29wZSI6WyJhY2NvdW50aW5nLmF0dGFjaG1lbnRzIiwiYWNjb3VudGluZy5idWRnZXRzLnJlYWQiLCJhY2NvdW50aW5nLmNvbnRhY3RzIiwiYWNjb3VudGluZy5jb250YWN0cy5yZWFkIiwiYWNjb3VudGluZy5yZXBvcnRzLnJlYWQiLCJhY2NvdW50aW5nLnNldHRpbmdzIiwiYWNjb3VudGluZy5zZXR0aW5ncy5yZWFkIiwiYWNjb3VudGluZy50cmFuc2FjdGlvbnMiLCJhY2NvdW50aW5nLnRyYW5zYWN0aW9ucy5yZWFkIl19.ESbKFN6A-wFOcZxyaa0MoOewdCIlla7ZrAALPeJNW3F9INpx_UTDj9E26sDb-aqJQfJ5zadmdUALLptNPMkjhj3GFYNlk_L8ytinF5p6Zyq5RroabrdVX3Y0AQFJEJ-V6vUYYk3aX_XbSZbK0ZZ-8guTSuuxsnvy4vzIbf2nYpLvR0kZKa9znQvweVbvbcD7l5We-wUsz5xqQ4-_8zSRgxzkZfmXsmMzeu3Ms1AEDRMTOIMkMP-fW-GlUumsvm050S1715wTrmeYrTiJIfToRVAkfprRsTW6jHMicJ8F8knaJ9_dnmamtG9wD7knMQG_hmKX-VHLcx0i_PdTlaQsxw",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios(config)
      .then(function (response: any) {
        console.log("data while getting response of invoices",response.data)

        resolve(response);
      })
      .catch(function (error: any) {
        console.log(error.response?.data)

        reject(error);
      });
  });
};
