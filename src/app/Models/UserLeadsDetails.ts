import {model, Model} from 'mongoose';

import {UserLeadsDetailsInterface} from '../../types/LeadDetailsInterface';
import {UserLeadsDetailsSchema} from "../../database/schemas/LeadsDetailsSchema";

const UserLeadsDetails: Model<UserLeadsDetailsInterface> = model<UserLeadsDetailsInterface>('UserLeadsDetails', UserLeadsDetailsSchema);

export {UserLeadsDetails};
