import { Schema } from "mongoose";

const LocationSchema = new Schema(
  {
    name: {
      type: String,
    },
    key: {
      type: String,
    },
    location: {
      type: {
        type: String,
      },
      coordinates: [Number],
    },
    admin_district: [String],
    country: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

LocationSchema.index({ location: "2dsphere" });

export { LocationSchema };
