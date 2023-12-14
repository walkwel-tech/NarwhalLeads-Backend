import { Document, Types } from "mongoose";

export interface AdInterface extends Document {
    image: string;
    title: string;
    description: string;
    buttonText: string;
    callToAction: string;
    _id: Types.ObjectId;
    isDeleted: boolean;
    isActive: boolean;
    startDate: Date ;
    endDate:  Date;
    targetReach: number;
    clickTotal: number;
    isTargetReachedEnable: boolean;

}
