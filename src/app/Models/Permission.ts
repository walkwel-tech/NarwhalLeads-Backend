import { model, Model } from "mongoose";

import { PermissionInterface } from "../../types/PermissionsInterface";
import { PermissionSchema } from "../../database/schemas/permissionsSchema";

const Permissions: Model<PermissionInterface> = model<PermissionInterface>(
  "Permissions",
  PermissionSchema
);

export { Permissions };
