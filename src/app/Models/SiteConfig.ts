import {model, Model} from "mongoose";

import { SiteConfigInterface } from "../../types/SiteConfig.interface";
import { SiteConfigSchema } from "../../database/schemas/SiteConfigSchema";

const SiteConfig: Model<SiteConfigInterface> = model<SiteConfigInterface>('SiteConfig', SiteConfigSchema);

export {SiteConfig};