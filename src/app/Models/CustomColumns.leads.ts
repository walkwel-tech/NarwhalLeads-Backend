import {model, Model} from 'mongoose';

import {customColumnsInterface} from '../../types/customColumnsInterface.leads';
import {customColumnNamesSchema} from "../../database/schemas/customColumnsSchema.leads";

const CustomColumnNames: Model<customColumnsInterface> = model<customColumnsInterface>('CustomColumnNames', customColumnNamesSchema);

export {CustomColumnNames};
