import { RolesEnum } from "../../../../types/RolesEnum";

export type RoleFilter = {
    $in: (RolesEnum.USER | RolesEnum.NON_BILLABLE)[];
  };