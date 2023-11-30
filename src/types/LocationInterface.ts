import {Document, Types} from "mongoose";

interface ILocationCoordinates {
    type: string;
    coordinates: []
}

export interface LocationInterface extends Document {
    name: string,
    location: ILocationCoordinates,
    _id: Types.ObjectId,
    key: string;
    country: string;
    admin_district: string[]
}