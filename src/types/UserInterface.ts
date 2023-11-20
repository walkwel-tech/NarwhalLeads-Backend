import { Document, Types } from "mongoose";

import { RolesEnum } from "./RolesEnum";
import { BusinessDetailsInterface } from "./BusinessInterface";

export interface UserInterface extends Document {
  createdAt: any;
  _id: Types.ObjectId;
  businessIndustryId: Types.ObjectId;
  firstName: string;
  lastName: string;
  isCommissionedUser: boolean;
  email: string;
  password: string;
  role: RolesEnum;
  paymentMethod: string;
  phoneNumber: string;
  credits: number;
  autoChargeAmount: number;
  leadCost: string;
  isLeadCostCheck: boolean;
  buyerId: string;
  xeroContactId: string;
  isXeroCustomer: boolean;
  isVerified: boolean;
  verifiedAt: Date;
  isActive: boolean;
  activatedAt: Date;
  isDeleted: boolean;
  rowIndex: number;
  isArchived: boolean;
  isUserSignup: boolean;
  invitedById: Types.ObjectId;
  userNotes: string;
  businessDetailsId: Types.ObjectId | BusinessDetailsInterface;
  userLeadsDetailsId: Types.ObjectId;
  onBoarding: Array<{
    key: string;
    pendingFields: string[];
    dependencies: string[];
  }>;
  registrationMailSentToAdmin: boolean;
  ryftClientId: string;
  isRyftCustomer: boolean;
  isLeadbyteCustomer: boolean;
  premiumUser: string;
  promoLinkId: Types.ObjectId;
  isLeadReceived: boolean;
  promoCodeUsed: boolean;
  onBoardingPercentage: number;
  userServiceId: Types.ObjectId;
  triggerAmount: number;
  isSmsNotificationActive: boolean;
  smsPhoneNumber: string;
  isSignUpCompleteWithCredit: boolean;
  isCreditsAndBillingEnabled: boolean;
  accountManager: Types.ObjectId;
  permissions: Array<{
    module: string;
    permission: string[];
  }>;
  isStripeCustomer: boolean;
  stripeClientId: string;
  showImpersonate: boolean;
}
