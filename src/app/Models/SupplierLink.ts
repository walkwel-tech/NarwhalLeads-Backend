import {model, Model} from "mongoose";
import { SupplierLinkInterface } from "../../types/SupplierLinkInterface";
import { SupplierLinkSchema } from "../../database/schemas/supplierLink.schema";

const SupplierLink: Model<SupplierLinkInterface> = model<SupplierLinkInterface>('SupplierLink', SupplierLinkSchema);

export {SupplierLink};
