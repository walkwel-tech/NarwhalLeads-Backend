import { model, Model } from "mongoose";

import { PlanPackagesInterface } from "../../types/PlanPackagesInterface";
import { planPackagsSchema } from "../../database/schemas/growthPlanPackage";

const PlanPackages: Model<PlanPackagesInterface> = model<PlanPackagesInterface>(
  "PlanPackages",
  planPackagsSchema
);

export { PlanPackages };
