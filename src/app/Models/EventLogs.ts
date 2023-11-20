import { model, Model } from "mongoose";

import { EventLogsInterface } from "../../types/EventLogsInterface";
import { EventLogsSchema } from "../../database/schemas/eventLogsSchema";

const EventLogs: Model<EventLogsInterface> = model<EventLogsInterface>(
  "EventLogsSchema",
  EventLogsSchema
);

export { EventLogs };
