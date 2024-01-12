import { model, Model } from 'mongoose';

import { AdInterface } from '../../types/AdInterface';
import { AdSchema } from '../../database/schemas/AdsSchema';

const Ad: Model<AdInterface> = model<AdInterface>('Ad', AdSchema);

export { Ad };
