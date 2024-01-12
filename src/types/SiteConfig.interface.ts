import { Document, Types } from "mongoose";

export interface SiteConfigInterface extends Document  {
    roundManagers: Array<Types.ObjectId>,
    key: string,
    _id: Types.ObjectId
}