import { model, Model } from "mongoose";

import { LogsInterface } from "../../types/LogsInterface";
import { LogsSchema } from "../../database/schemas/LogsSchema";

const Logs: Model<LogsInterface> = model<LogsInterface>("Logs", LogsSchema);

export { Logs };
