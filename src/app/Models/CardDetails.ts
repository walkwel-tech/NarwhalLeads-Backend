import {model, Model} from 'mongoose';

import {CardDetailsInterface} from '../../types/CardDetailsInterface';
import {CardDetailsSchema} from "../../database/schemas/CardDetailsSchema";

const CardDetails: Model<CardDetailsInterface> = model<CardDetailsInterface>('CardDetails', CardDetailsSchema);

export {CardDetails};
