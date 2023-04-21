import {model, Model} from 'mongoose';

import {BuisnessIndustriesInterface} from '../../types/BuisnessIndustriesInterface';
import {BuisnessIndustriesSchema} from "../../database/schemas/BuisnessIndustriesSchema";

const BuisnessIndustries: Model<BuisnessIndustriesInterface> = model<BuisnessIndustriesInterface>('BuisnessIndustries', BuisnessIndustriesSchema);

export {BuisnessIndustries};