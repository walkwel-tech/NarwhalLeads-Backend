import {model, Model} from 'mongoose';

import {ActivityLogsInterface} from '../../types/ActivityLogInterface';
import {ActivityLogsSchema} from "../../database/schemas/activityLogs.schema";

const ActivityLogs: Model<ActivityLogsInterface> = model<ActivityLogsInterface>('ActivityLogs', ActivityLogsSchema);

export {ActivityLogs};
