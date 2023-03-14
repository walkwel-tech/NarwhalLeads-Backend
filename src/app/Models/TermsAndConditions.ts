import {model, Model} from 'mongoose';

import {TermsAndConditionsInterface} from '../../types/TermsAndConditionsInterface';
import {TermsAndConditionsSchema} from "../../database/schemas/T&C.Schema";

const TermsAndConditions: Model<TermsAndConditionsInterface> = model<TermsAndConditionsInterface>('TermsAndConditions', TermsAndConditionsSchema);

export {TermsAndConditions};
