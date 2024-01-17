export interface XeroResponseInterface {
    Invoices: invoices[]
}

type invoices = {
    InvoiceID: string
}