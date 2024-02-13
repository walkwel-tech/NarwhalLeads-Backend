import {model, Model} from 'mongoose';
import {SupplierBadgeSchema} from "../../database/schemas/SupplierBadge";
import {SupplierBadgeInterface} from "../../types/SupplierBadgeInterface";


const SupplierBadge: Model<SupplierBadgeInterface> = model<SupplierBadgeInterface>('SupplierBadge', SupplierBadgeSchema);

export {SupplierBadge};
