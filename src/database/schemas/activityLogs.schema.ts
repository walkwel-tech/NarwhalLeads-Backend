import { Schema } from "mongoose";

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
        type: String,
    },
    originalValues: {
        type: Array,
    },
    modifiedValues: {
        type: Array,
    },

}, {timestamps: true});
export {ActivityLogsSchema};
