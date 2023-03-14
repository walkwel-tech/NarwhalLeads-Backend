import {model, Model} from 'mongoose';

import {LeadsInterface} from '../../types/LeadsInterface';
import {LeadsSchema} from "../../database/schemas/LeadsSchema";

const Leads: Model<LeadsInterface> = model<LeadsInterface>('Leads', LeadsSchema);

export {Leads};
