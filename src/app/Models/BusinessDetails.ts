import {model, Model} from 'mongoose';
import {BusinessDetailsInterface} from '../../types/BusinessInterface';
import {BusinessDetailsSchema} from "../../database/schemas/BusinessSchema";

const BusinessDetails: Model<BusinessDetailsInterface> = model<BusinessDetailsInterface>('BusinessDetails', BusinessDetailsSchema);

export {BusinessDetails};
