import {model, Model} from 'mongoose';

import {AdminsListInterface} from '../../types/AdminListInterface';
import {AdminSchema} from "../../database/schemas/adminsSchema";

const Admins: Model<AdminsListInterface> = model<AdminsListInterface>('Admins', AdminSchema);

export {Admins};
