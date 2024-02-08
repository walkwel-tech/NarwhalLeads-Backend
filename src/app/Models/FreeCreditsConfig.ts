import {model, Model} from "mongoose";

import { FreeCreditsConfigInterface } from "../../types/FreeCreditsConfigInterface";
import { FreeCreditsConfigSchema } from "../../database/schemas/FreeCreditsConfigSchema";

const FreeCreditsConfig: Model<FreeCreditsConfigInterface> = model<FreeCreditsConfigInterface>('freecreditsconfig', FreeCreditsConfigSchema);

export { FreeCreditsConfig };