import { model, Model } from "mongoose";

import { LocationInterface } from "../../types/LocationInterface";
import { LocationSchema } from "../../database/schemas/LocationSchema";

const Location: Model<LocationInterface> = model<LocationInterface>(
  "Location",
  LocationSchema
);

export { Location };
