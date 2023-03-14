import {model, Model} from 'mongoose';

import {freeCreditsLinkInterface} from '../../types/FreeCreditsLinkInterface';
import {FreeCreditsLinkSchema} from "../../database/schemas/freeCreditsLink.schema";

const FreeCreditsLink: Model<freeCreditsLinkInterface> = model<freeCreditsLinkInterface>('FreeCreditsLink', FreeCreditsLinkSchema);

export {FreeCreditsLink};
