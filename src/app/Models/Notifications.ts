import {model, Model} from 'mongoose';

import {NotificationsInterface} from '../../types/NotificationsInterface.';
import {NotificationsSchema} from "../../database/schemas/notifications.schema";

const Notifications: Model<NotificationsInterface> = model<NotificationsInterface>('Notifications',NotificationsSchema );

export {Notifications};