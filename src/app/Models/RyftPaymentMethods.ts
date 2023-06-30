import {model, Model} from 'mongoose';

import {RyftPaymentInterface} from '../../types/RyftPaymentInterface';
import {RyftPaymentSchema} from "../../database/schemas/RyftPaymentSchema";

const RyftPaymentMethods: Model<RyftPaymentInterface> = model<RyftPaymentInterface>('ryftPaymentMethods', RyftPaymentSchema);

export {RyftPaymentMethods};
