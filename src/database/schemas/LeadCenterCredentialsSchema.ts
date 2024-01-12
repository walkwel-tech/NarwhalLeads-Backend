import { Schema } from "mongoose";

const leadCredentialsSchema = new Schema({
  token: {
    type: String,
    default: null,
  },
});
export { leadCredentialsSchema };
