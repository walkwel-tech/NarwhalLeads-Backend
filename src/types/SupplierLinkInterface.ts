import { Date, Document, Types } from "mongoose";

export interface SupplierLinkInterface extends Document {
    _id: Types.ObjectId,
    userId: Types.ObjectId,
    link: String,
    firstSeen: Date,    // when firstly checked for badge.
    lastSeen: Date, // i.e when lastly badge is shown
    lastChecked: Date,  // this is cron date when last checked for date
    transactionID: Types.ObjectId,
    amount: number,
}