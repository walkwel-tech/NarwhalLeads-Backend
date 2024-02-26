import {model, Model} from 'mongoose';
import { FreeCreditsLinkContentSchema } from '../../database/schemas/freeCreditsLinkContentSchems';
import { FreeCreditsLinkContentInterface } from '../../types/FreeCreditsLinkContentInterface';

const FreeCreditsLinkContent: Model<FreeCreditsLinkContentInterface> = model<FreeCreditsLinkContentInterface>('FreeCreditsLinkContent', FreeCreditsLinkContentSchema);

export {FreeCreditsLinkContent};
