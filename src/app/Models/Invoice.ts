import { model, Model } from "mongoose";

import { InvoiceInterface } from "../../types/InvoiceInterface";
import { invoiceSchema } from "../../database/schemas/invoiceSchema";

const Invoice: Model<InvoiceInterface> = model<InvoiceInterface>(
  "Invoice",
  invoiceSchema
);

export { Invoice };
