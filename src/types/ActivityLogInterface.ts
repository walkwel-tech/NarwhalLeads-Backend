import { Document, Types } from "mongoose";

export interface ActivityLogsInterface extends Document {
    actionBy:string
    actionType:string
    targetModel:string;
    userEntity: Types.ObjectId;
    originalValues:[];
    modifiedValues:[];
}
