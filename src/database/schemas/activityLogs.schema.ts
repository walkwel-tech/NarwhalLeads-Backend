import { Schema, Types } from "mongoose";

const ActivityLogsSchema = new Schema({
    actionBy: {
        type: String,
    },
    actionType: {
        type: String,
    },
    targetModel: {
        type: String,
    },
    userEntity: {
        type: Types.ObjectId,
        default: null,
        ref: "User",
      },
    originalValues: {
        type: Array,
    },
    modifiedValues: {
        type: Array,
    },

}, {timestamps: true});
export {ActivityLogsSchema};
