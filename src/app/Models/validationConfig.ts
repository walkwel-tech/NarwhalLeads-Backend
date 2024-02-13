import {model, Model} from 'mongoose';

import {ValidationConfigInterface} from '../../types/validationConfigInterface';
import {ValidationConfigSchema} from "../../database/schemas/validationConfigSchema";

const ValidationConfig: Model<ValidationConfigInterface> = model<ValidationConfigInterface>('ValidationConfig', ValidationConfigSchema);

export {ValidationConfig};
