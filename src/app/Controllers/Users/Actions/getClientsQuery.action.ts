import { PipelineStage, Types } from "mongoose";
import { RolesEnum } from "../../../../types/RolesEnum";
import { sort } from "../../../../utils/Enums/sorting.enum";
import { ClientType, NULL_MANAGER, userStatus } from "../../../Inputs/GetClients.input";

interface IGetClientsQuery {
  sortingOrder: string;
  clientType: string;
  search: string;
  accountManagerId: string;
  businessDetailId: string;
  industryId: string;
  clientStatus: string;
  onBoardingPercentage: string;
}

interface SortStage {
  $sort: Record<string, 1 | -1>;
}

export const getClientsQuery = ({
  sortingOrder,
  clientType,
  search,
  accountManagerId,
  businessDetailId,
  industryId,
  clientStatus,
  onBoardingPercentage,
}: IGetClientsQuery): PipelineStage[] => {
  const sortStage: SortStage = {
    $sort: {
      createdAt: sortingOrder == sort.DESC ? -1 : 1,
    },
  };

  const pipeline: PipelineStage[] = [
    {
      $match: {
        role: {
          $nin: [
            RolesEnum.ADMIN,
            RolesEnum.INVITED,
            RolesEnum.SUPER_ADMIN,
            RolesEnum.SUBSCRIBER,
          ],
        },
        ...(clientType
          ? {
              ...(clientType === ClientType.BILLABLE
                ? { isCreditsAndBillingEnabled: true }
                : {
                    isCreditsAndBillingEnabled: false,
                  }),
            }
          : {}),
        // isDeleted: false,
        isActive: true,
        ...(search
          ? {
              $or: [
                { email: { $regex: search, $options: "i" } },
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { buyerId: { $regex: search, $options: "i" } },
                {
                  $expr: {
                    $regexMatch: {
                      input: { $concat: ["$firstName", " ", "$lastName"] },
                      regex: search,
                      options: "i",
                    },
                  },
                },
                {
                  "businessDetailsId.businessName": {
                    $regex: search,
                    $options: "i",
                  },
                },
                {
                  "businessDetailsId.businessIndustry": {
                    $regex: search,
                    $options: "i",
                  },
                },
              ],
            }
          : {}),
        ...(accountManagerId
          ? {
              accountManager:
                accountManagerId === NULL_MANAGER
                  ? null
                  : new Types.ObjectId(accountManagerId as string),
            }
          : {}),
        ...(businessDetailId
          ? {
              businessDetailsId: new Types.ObjectId(businessDetailId as string),
            }
          : {}),
        ...(industryId
          ? { businessIndustryId: new Types.ObjectId(industryId as string) }
          : {}),
        ...(onBoardingPercentage
          ? { onBoardingPercentage: +onBoardingPercentage }
          : {}),

        ...(clientStatus && clientStatus === userStatus.LOST
          ? { isDeleted: true }
          : { isDeleted: false }),
        ...(clientStatus && clientStatus === userStatus.ARCHIVED
          ? { isArchived: true }
          : {}),
      },
    },

    ...(clientStatus == userStatus.PENDING
      ? [
          {
            $match: {
              clientStatus: userStatus.PENDING,
            },
          },
        ]
      : []),
    ...(clientStatus == userStatus.ACTIVE
      ? [
          {
            $match: {
              clientStatus: userStatus.ACTIVE,
            },
          },
        ]
      : []),
    ...(clientStatus == userStatus.INACTIVE
      ? [
          {
            $match: {
              clientStatus: userStatus.INACTIVE,
            },
          },
        ]
      : []),
    sortStage,
  ];

  return pipeline;
};
