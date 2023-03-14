import {model, Model} from 'mongoose';

import {AdminSettingsInterface} from '../../types/AdminSettingInterface';
import {AdminSettingsSchema} from "../../database/schemas/AdminSettingsSchema";

const AdminSettings: Model<AdminSettingsInterface> = model<AdminSettingsInterface>('AdminSettings', AdminSettingsSchema);

export {AdminSettings};
