import { Schema, Types } from "mongoose";

const AuthenticationKeySchema = new Schema(
    {
        userId: {
            type: Types.ObjectId,
            required: true
        },
        notes: {
            type: String 
        },
        key: {
            type: String
        }
    },{
        timestamps: true
    }
)

export {AuthenticationKeySchema}