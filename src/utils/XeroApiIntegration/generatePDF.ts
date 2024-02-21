import { checkAccess } from "../../app/Middlewares/serverAccess";
import { AccessToken } from "../../app/Models/AccessToken";
import { User } from "../../app/Models/User";
import { CURRENCY, DISCOUNT } from "../Enums/currency.enum";
import { transactionTitle } from "../Enums/transaction.title.enum";
import axios, { AxiosResponse } from "axios";
import { ACCOUNT_CODE } from "../constantFiles/accountCode.xero";
import { XeroResponseInterface } from "../../types/XeroResponseInterface";
import { XeroInvoiceRequestInterface } from "../../types/XeroInvoiceRequestInterface";

export interface generatePDFParams {
  ContactID: string;
  desc: string;
  amount: number;
  freeCredits: number;
  sessionId: string;
  isManualAdjustment: boolean;
}
export const generatePDF = (param: generatePDFParams): Promise<AxiosResponse<XeroResponseInterface>> => {
  return new Promise(async (resolve, reject) => {
    const industry: any = await User.findOne({
      xeroContactId: param.ContactID,
    }).populate("businessDetailsId");
    let quantity = param.amount / parseFloat(industry.leadCost)
    let accountCode = ACCOUNT_CODE.GBP;

    switch(true){
      case industry.currency === CURRENCY.POUND && param.sessionId != transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT:
        accountCode = ACCOUNT_CODE.GBP;
        break;
      case industry.currency === CURRENCY.EURO:
        accountCode = ACCOUNT_CODE.EURO;
        break;
      case industry.currency === CURRENCY.DOLLER:
        accountCode = ACCOUNT_CODE.USA;
        break;
      case param.sessionId === transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT:
        accountCode = ACCOUNT_CODE.SECONDARY_CREDITS_MANUAL_ADJUSTMENT;
        break;
    }

    let unitAmount = industry.leadCost;
    if (accountCode === ACCOUNT_CODE.SECONDARY_CREDITS_MANUAL_ADJUSTMENT) {
      unitAmount = industry.secondaryLeadCost;
      quantity = param.amount / industry.secondaryLeadCost;
    }
    let data: XeroInvoiceRequestInterface = {
      Invoices: [
        {
          Type: "ACCREC",
          Contact: {
            ContactID: param.ContactID,
          },
          LineItems: [
            {
              Description: `${industry?.businessDetailsId?.businessIndustry} - ${param.desc}`,
              Quantity: quantity,
              UnitAmount: unitAmount,
              AccountCode: accountCode,
              LineAmount: param.amount,
              LeadDepartment: industry?.businessDetailsId?.businessIndustry,
            },
          ],
          Date: new Date(),
          DueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
          Reference: param.sessionId,
          Status: "AUTHORISED",
          CurrencyCode: industry.currency,
        },
      ],
    } as XeroInvoiceRequestInterface;
    if (
      param.freeCredits > 0 &&
      !param.isManualAdjustment &&
      param.sessionId != transactionTitle.SECONDARY_CREDITS_MANUAL_ADJUSTMENT
    ) {
      const quantity = param.freeCredits / parseInt(industry.leadCost);
      data.Invoices[0].LineItems[1] = {
        Description: `${industry?.businessDetailsId?.businessIndustry} - ${transactionTitle.FREE_CREDITS}`,
        Quantity: quantity,
        UnitAmount: unitAmount,
        AccountCode: accountCode,

        DiscountRate: DISCOUNT,
        LeadDepartment: industry?.businessDetailsId?.businessIndustry,
      };
    } else if (param.freeCredits > 0 && param.isManualAdjustment) {
      const quantity = param.freeCredits / parseInt(industry.leadCost);
      data.Invoices[0].LineItems[0] = {
        Description: `${industry?.businessDetailsId?.businessIndustry} - ${transactionTitle.FREE_CREDITS}`,
        Quantity: quantity,
        UnitAmount: unitAmount,
        AccountCode: accountCode,
        DiscountRate: DISCOUNT,
        LeadDepartment: industry?.businessDetailsId?.businessIndustry,
      };
    }

    const token = await AccessToken.findOne();
    var config = {
      method: "post",
      url: process.env.GENERATE_PDF_URL,
      headers: {
        "xero-tenant-id": process.env.XERO_TETANT_ID,
        Authorization: "Bearer " + token?.access_token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: JSON.stringify(data),
    };
    if (checkAccess()) {
      axios(config)
        .then(function (response: AxiosResponse<XeroResponseInterface>) {
          console.log(
            "data while getting response of invoices",
            response.data,
            new Date(),
            "Today's Date"
          );

          resolve(response);
        })
        .catch(function (error) {
          console.log(error.response?.data, new Date(), "Today's Date");

          reject(error);
        });
    } else {
      console.log(
        "No Access for generating PDF to this " + process.env.APP_ENV,
        new Date(),
        "Today's Date"
      );
    }
  });
};
