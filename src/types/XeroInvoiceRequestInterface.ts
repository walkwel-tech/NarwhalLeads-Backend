export interface XeroInvoiceRequestInterface {
    Invoices: Array<InvoiceInfo>
}

interface InvoiceInfo {
    Type: string;
    Contact: {
        ContactID: string;
    }
    LineItems: Array<InvoiceLineItem>;
    Date: Date;
    DueDate: Date;
    Reference: String;
    Status: "AUTHORISED",
    CurrencyCode: "USD" | "EUR" | "GBP"
}

interface InvoiceLineItem {
    Description: string;
    Quantity: Number;
    UnitAmount: Number;
    DiscountRate?: String;
    AccountCode: String;
    LineAmount?: Number;
    LeadDepartment: String
}
