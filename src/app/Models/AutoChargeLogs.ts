import { model, Model } from "mongoose";

import { AutoUpdatedTasksLogsInterface } from "../../types/AutoUpdatedTasksLogsInterface";
import { AutoUpdatedTasksLogsSchema } from "../../database/schemas/AutoUpdatedTasksLogsSchema";

const AutoUpdatedTasksLogs: Model<AutoUpdatedTasksLogsInterface> =
  model<AutoUpdatedTasksLogsInterface>(
    "AutoUpdatedTasksLogs",
    AutoUpdatedTasksLogsSchema
  );

export { AutoUpdatedTasksLogs };
