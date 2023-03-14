import { Schema } from "mongoose";

const AccessTokenSchema = new Schema({
    access_token: {
        type: String,
    },
    refresh_token: {
        type: String,
    },
}, {timestamps: true});
export {AccessTokenSchema};
