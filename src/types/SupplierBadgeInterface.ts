import {Document, Types} from 'mongoose';
import {AllowedBadgeTypes} from "./AllowedBadgeTypes";

export interface SupplierBadgeInterface extends Document {
    title: string;
    type: AllowedBadgeTypes;
    codeSnippet: string;
    imageUrl: string;
    isActive: boolean;
    order: number;
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
