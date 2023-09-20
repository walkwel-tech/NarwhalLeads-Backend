import { Document } from "mongoose";

export interface ActivityLogsInterface extends Document {
    actionBy:string
    actionType:string
    targetModel:string;
    userEntity:string;
    originalValues:[];
    modifiedValues:[];
}
