import {model, Model} from 'mongoose';
import { BuyerDetailsInterface } from '../../types/BuyerDetailsInterface';
import { BuyerDetailsSchema } from '../../database/schemas/buyerDetailsSchema';

const BuyerDetails: Model<BuyerDetailsInterface> = model<BuyerDetailsInterface>('BuyerDetails', BuyerDetailsSchema);

export {BuyerDetails};
