import {model, Model} from 'mongoose';

import {FaqInterface} from '../../types/FaqInterface';
import {FaqSchema} from "../../database/schemas/faqSchema";

const FAQ: Model<FaqInterface> = model<FaqInterface>('FAQ', FaqSchema);

export {FAQ};
