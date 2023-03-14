import {model, Model} from 'mongoose';

import {invoiceInterface} from '../../types/InvoiceInterface';
import {invoiceSchema} from "../../database/schemas/invoiceSchema";

const Invoice: Model<invoiceInterface> = model<invoiceInterface>('Invoice', invoiceSchema);

export {Invoice};