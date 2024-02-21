import {AxiosResponse} from "axios";
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
import logger from "../winstonLogger/logger";

export const generatePdfAsync = (userId: UserInterface, transaction: TransactionInterface, paramPdf: generatePDFParams, transactionForVat: TransactionInterface, invoice: InvoiceInterface, originalAmount: number, freeCredits: number, id: string): Promise<InvoiceInterface> => {
    return new Promise((resolve, reject) => {
        generatePDF(paramPdf)
            .then(async (res: AxiosResponse<XeroResponseInterface>) => {
                const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                    userId: userId?.id,
                    transactionId: transaction.id,
                    price: userId?.credits,
                    invoiceId: res.data.Invoices[0].InvoiceID
                };
                invoice = await Invoice.create(dataToSaveInInvoice);

                await Transaction.findByIdAndUpdate(transaction.id, {
                    invoiceId: res.data.Invoices[0].InvoiceID,
                });

                await Transaction.findByIdAndUpdate(transactionForVat.id, {
                    invoiceId: res.data.Invoices[0].InvoiceID,
                });

                logger.info("pdf generated", { res });

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

                    generatePDF(paramPdf).then(async (res: AxiosResponse<XeroResponseInterface>) => {
                        const dataToSaveInInvoice: Partial<InvoiceInterface> = {
                            userId: userId?.id,
                            transactionId: transaction.id,
                            price: userId?.credits,
                            invoiceId: res.data.Invoices[0].InvoiceID,
                        };

                        invoice = await Invoice.create(dataToSaveInInvoice);

                        await Transaction.findByIdAndUpdate(transaction.id, {
                            invoiceId: res.data.Invoices[0].InvoiceID,
                        });

                        resolve(invoice)

                        logger.info(
                            "pdf generated",
                            { res }
                        );
                    }).catch((err) => {
                        logger.error("Error while generating pdf.", err)
                    });
                }).catch((err) => {
                    logger.error("Error in retreiving refresh token", err)
                });
            });
    })
}
