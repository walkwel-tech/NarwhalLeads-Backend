import {
    generatePDF,
    generatePDFParams,
} from "../../utils/XeroApiIntegration/generatePDF";
import { XeroResponseInterface } from "../../types/XeroResponseInterface";
import { InvoiceInterface } from "../../types/InvoiceInterface";
import { UserInterface } from "../../types/UserInterface";
import { TransactionInterface } from "../../types/TransactionInterface";
import { Transaction } from "../../app/Models/Transaction";
import { Invoice } from "../../app/Models/Invoice";
import {
    refreshToken,
} from "../../utils/XeroApiIntegration/createContact";
import { transactionTitle } from "../../utils/Enums/transaction.title.enum";

export const generatePdfAsync = (userId: UserInterface, transaction: TransactionInterface, paramPdf: generatePDFParams, transactionForVat: TransactionInterface, invoice: InvoiceInterface, originalAmount: number, freeCredits: number, id: string): Promise<InvoiceInterface> => {
    return new Promise((resolve, reject) => {
        generatePDF(paramPdf)
            .then(async (res: XeroResponseInterface) => {
                const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                    userId: userId?.id,
                    transactionId: transaction.id,
                    price: userId?.credits,
                    invoiceId: res.Invoices[0].InvoiceID
                };
                invoice = await Invoice.create(dataToSaveInInvoice);

                await Transaction.findByIdAndUpdate(transaction.id, {
                    invoiceId: res.Invoices[0].InvoiceID,
                });

                await Transaction.findByIdAndUpdate(transactionForVat.id, {
                    invoiceId: res.Invoices[0].InvoiceID,
                });

                console.log("pdf generated", new Date(), "Today's Date");

                resolve(invoice)
            })
            .catch(async (err) => {
                refreshToken().then(async (res) => {
                    const paramPdf: generatePDFParams = {
                        ContactID: userId?.xeroContactId,
                        desc: transactionTitle.CREDITS_ADDED,
                        amount: originalAmount,
                        freeCredits: freeCredits,
                        sessionId: id,
                        isManualAdjustment: false,
                    };

                    generatePDF(paramPdf).then(async (res: XeroResponseInterface) => {
                        const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                            userId: userId?.id,
                            transactionId: transaction.id,
                            price: userId?.credits,
                            invoiceId: res.Invoices[0].InvoiceID,
                        };

                        invoice = await Invoice.create(dataToSaveInInvoice);

                        await Transaction.findByIdAndUpdate(transaction.id, {
                            invoiceId: res.Invoices[0].InvoiceID,
                        });

                        resolve(invoice)

                        console.log(
                            "pdf generated",
                            new Date(),
                            "Today's Date"
                        );
                    }).catch((err) => {
                        console.error("Error while generating pdf.", JSON.stringify(err), new Date())
                    });
                }).catch((err) => {
                    console.error("Error in retreiving refresh token", JSON.stringify(err), new Date())
                });
            });
    })
}