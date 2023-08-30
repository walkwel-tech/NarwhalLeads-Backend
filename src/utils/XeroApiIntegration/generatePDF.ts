import { AccessToken } from "../../app/Models/AccessToken";
import { User } from "../../app/Models/User";

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
              //@ts-ignore
              Quantity: parseInt(quantity),
              UnitAmount: industry.leadsCost,
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
        // Authorization: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFDQUY4RTY2NzcyRDZEQzAyOEQ2NzI2RkQwMjYxNTgxNTcwRUZDMTkiLCJ0eXAiOiJKV1QiLCJ4NXQiOiJISy1PWm5jdGJjQW8xbkp2MENZVmdWY09fQmsifQ.eyJuYmYiOjE2OTMzODM1MjQsImV4cCI6MTY5MzM4NTMyNCwiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS54ZXJvLmNvbSIsImF1ZCI6Imh0dHBzOi8vaWRlbnRpdHkueGVyby5jb20vcmVzb3VyY2VzIiwiY2xpZW50X2lkIjoiNjJDRDNGQkQyNENENEZGMUI4RUFGNEMyQzNGODI0NkYiLCJ4ZXJvX3VzZXJpZCI6IjQxYjlhNWJkLTM3YzEtNDIyNy1hNzkyLTdmYjkxYWRmOGIyNCIsImp0aSI6IkRBRDI4MDE4QkI3QzE0NzMwQjRGQUExQTcwMzhDRjBBIiwiYXV0aGVudGljYXRpb25fZXZlbnRfaWQiOiJhNTQxYjcwOC04YTFhLTQ0NTItYmYzMC0yMzE4NTE1Zjk4ZWMiLCJzY29wZSI6WyJhY2NvdW50aW5nLmF0dGFjaG1lbnRzIiwiYWNjb3VudGluZy5idWRnZXRzLnJlYWQiLCJhY2NvdW50aW5nLmNvbnRhY3RzIiwiYWNjb3VudGluZy5jb250YWN0cy5yZWFkIiwiYWNjb3VudGluZy5yZXBvcnRzLnJlYWQiLCJhY2NvdW50aW5nLnNldHRpbmdzIiwiYWNjb3VudGluZy5zZXR0aW5ncy5yZWFkIiwiYWNjb3VudGluZy50cmFuc2FjdGlvbnMiLCJhY2NvdW50aW5nLnRyYW5zYWN0aW9ucy5yZWFkIl19.vUevl5Ek0oNSqPrDEa_fpf5WFYiHwbSFPRTjjEDCz1OPofl4YT7g-jM0aCXMWdCnb3aIwkHcVyrCXgWbuKf0fItiR6urgLp6y8J4Ble6CvSY_kTBh086_xT-mo2ANiJF0VSVB1ofn75WmgFI-Xtj2HmEeC4yCarny3J2S-U0T6VDKf0RGdlmUZIoDrw5kyd73z4Msv2XXEHn38G0wD4YOeVoG45evwpNdYXoJsPk7FOesXg5LkdQvZELWIUkO0RKSb3C2NtEZmp-41idcf-HgcKPBbsFSZtpPtjQKwIBreDSqG_aISE-JpREL1a9xOy4F7TIctIHd6hJFmB0qABCZw",
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
        reject(error);
        // console.log(error.response?.data)
      });
  });
};
